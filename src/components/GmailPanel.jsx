import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export function GmailPanel({ ingredients = [], compact = false }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pollResult, setPollResult] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [st, msgs] = await Promise.all([api.getGmailStatus(), api.getGmailMessages()]);
      setStatus(st);
      setMessages(msgs || []);
    } catch (err) {
      console.warn('Gmail status error:', err);
      setStatus({ configured: false, connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleConnect = async () => {
    try {
      const res = await api.getGmailAuthUrl();
      if (res?.url) {
        window.open(res.url, '_blank', 'width=560,height=700');
        setTimeout(refresh, 8000);
      }
    } catch (err) {
      alert(err.message || 'Gmail is not configured. Add GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET to the .env file');
    }
  };

  const handlePoll = async () => {
    setLoading(true);
    try {
      const res = await api.pollGmail();
      setPollResult(res);
      setStatus(st => ({ ...(st || {}), ...(res.account ? { connected: true, account: res.account } : {}) }));
      const msgs = await api.getGmailMessages();
      setMessages(msgs || []);
    } catch (err) {
      console.warn('Poll error:', err);
      alert('Poll failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await api.disconnectGmail();
    setStatus({ configured: true, connected: false, account: null });
    setMessages([]);
    setPollResult(null);
  };

  return (
    <div className="glass-card rounded-3xl border border-white/60 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">Supplier Email Ingestion (Gmail)</h4>
          <p className="text-xs text-amber-900/70 font-medium">
            Connect a Gmail inbox. Supplier replies are scanned and matched to purchase orders so delivery items land in the system, not your email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.connected ? (
            <>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 text-[10px] font-extrabold">
                Connected: {status.account?.email}
              </span>
              <button type="button" onClick={handleDisconnect} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-700 hover:bg-red-500/20">
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!status?.configured || loading}
              className="px-3 py-1.5 rounded-xl bg-[#3C2A21] text-amber-100 text-[11px] font-bold hover:brightness-110 disabled:opacity-50"
            >
              Connect Gmail
            </button>
          )}
        </div>
      </div>

      {!status?.configured && (
        <p className="mt-3 text-[11px] font-semibold text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          Gmail OAuth is not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in the .env file to enable incoming supplier emails.
        </p>
      )}

      {status?.connected && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handlePoll}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-amber-900/10 text-[#693F27] text-[11px] font-bold hover:bg-amber-900/20 disabled:opacity-50"
          >
            {loading ? 'Scanning inbox...' : 'Scan Inbox Now'}
          </button>
          {pollResult && (
            <span className="text-[11px] font-semibold text-amber-900/60">
              Scanned {pollResult.scanned}, matched {pollResult.matched}, new {pollResult.newlySaved}
            </span>
          )}
        </div>
      )}

      {messages.length > 0 && !compact && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900/50">Scanned Supplier Messages</p>
          {messages.map((m) => {
            const items = typeof m.matched_items === 'string'
              ? (() => { try { return JSON.parse(m.matched_items) || []; } catch { return []; } })()
              : (Array.isArray(m.matched_items) ? m.matched_items : []);
            const itemNames = ingredients.map(i => i.name.toLowerCase());
            const recognized = items.filter(i => itemNames.some(n => i.name.toLowerCase().includes(n)));
            return (
              <div key={m.id} className="p-3 rounded-xl border border-amber-900/10 bg-[#FFFDF9]/80 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-bold text-[#3C2A21] truncate">{m.subject}</p>
                    <p className="text-[10px] text-amber-900/50 font-semibold">{m.from_email} · {new Date(m.parsed_at).toLocaleString()}</p>
                  </div>
                  {m.po_code && (
                    <span className="px-2 py-0.5 rounded-full bg-[#3C2A21]/10 text-[#693F27] text-[10px] font-extrabold">{m.po_code}</span>
                  )}
                </div>
                {items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((it, idx) => (
                      <span key={idx} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                        recognized.includes(it)
                          ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-900 border-amber-500/20'
                      }`}>
                        {it.quantity} {it.unit} · {it.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {compact && status?.connected && messages.length > 0 && (
        <p className="mt-3 text-[11px] font-semibold text-amber-900/60">{messages.length} scanned supplier message(s).</p>
      )}

      {messages.length === 0 && status?.connected && !loading && (
        <p className="mt-4 text-xs text-amber-900/40 font-medium text-center py-2">No supplier messages scanned yet.</p>
      )}
    </div>
  );
}
