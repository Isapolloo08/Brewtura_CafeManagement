import React, { useState, useEffect, useCallback } from 'react';
import { ModalPortal } from './ModalPortal';
import api from '../services/api.js';
import { socket } from '../services/socket.js';

function parseItems(matched) {
  if (typeof matched === 'string') {
    try { return JSON.parse(matched) || []; } catch { return []; }
  }
  return Array.isArray(matched) ? matched : [];
}

function parseName(fromEmail) {
  if (!fromEmail) return 'Supplier';
  const m = fromEmail.match(/^([^<]+)/);
  const name = m ? m[1].replace(/"/g, '').trim() : '';
  return name || fromEmail;
}

function parseEmail(fromEmail) {
  if (!fromEmail) return '';
  const m = fromEmail.match(/<([^>]+)>/);
  return m ? m[1] : fromEmail.trim();
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || 'S';
}

export function InboxPanel() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyMsg, setReplyMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentReplies, setSentReplies] = useState({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [st, msgs] = await Promise.all([api.getGmailStatus(), api.getGmailMessages()]);
      setStatus(st);
      setMessages(msgs || []);
    } catch (err) {
      console.warn('Inbox status error:', err);
      setStatus({ configured: false, connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onNewMessage = () => { refresh(); };
    const onRefresh = () => { refresh(); };
    socket.on('supplier-message', onNewMessage);
    socket.on('supplier-message-refresh', onRefresh);
    return () => {
      socket.off('supplier-message', onNewMessage);
      socket.off('supplier-message-refresh', onRefresh);
    };
  }, [refresh]);

  const handleScan = async () => {    setLoading(true);
    try {
      const res = await api.pollGmail();
      setStatus(st => ({ ...(st || {}), ...(res.account ? { connected: true, account: res.account } : {}) }));
      const msgs = await api.getGmailMessages();
      setMessages(msgs || []);
    } catch (err) {
      console.warn('Scan error:', err);
      alert('Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (m) => {
    const body = replyText.trim();
    if (!body) return;
    setSending(true);
    setReplyMsg('');
    try {
      const to = parseEmail(m.from_email);
      const subject = (m.subject || '').startsWith('Re:') ? m.subject : `Re: ${m.subject || ''}`;
      await api.sendGmailEmail({ to, subject, body, messageId: m.gmail_message_id });
      setSentReplies(prev => ({
        ...prev,
        [m.id]: [...(prev[m.id] || []), { body, time: new Date().toLocaleString() }],
      }));
      setReplyText('');
      setReplyMsg(`Reply sent to ${parseName(m.from_email)} ✓`);
    } catch (err) {
      setReplyMsg('Send failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl glass-card rounded-3xl overflow-hidden border border-white/60 animate-scaleIn max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-amber-900/10 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">Supplier Inbox</h4>
                  <p className="text-xs text-amber-900/70 font-medium">{messages.length} message(s) from suppliers</p>
                </div>
                <div className="flex items-center gap-2">
                  {status?.connected && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 text-[10px] font-extrabold">
                      {status.account?.email}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={!status?.connected || loading}
                    className="px-3 py-1.5 rounded-xl bg-amber-900/10 text-[#693F27] text-[11px] font-bold hover:bg-amber-900/20 disabled:opacity-50"
                  >
                    {loading ? 'Scanning...' : 'Scan Inbox Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-700 text-[11px] font-bold hover:bg-red-500/20"
                  >
                    Close
                  </button>
                </div>
              </div>

              {!status?.configured && (
                <p className="mx-6 mt-4 text-[11px] font-semibold text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                  Gmail OAuth is not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in the .env file to enable incoming supplier emails.
                </p>
              )}

              {messages.length === 0 && status?.connected && !loading && (
                <p className="text-xs text-amber-900/40 font-medium text-center py-8">
                  No supplier messages yet. Click "Scan Inbox Now" to check for new replies.
                </p>
              )}

              {messages.length > 0 && (
                <div className="divide-y divide-amber-900/10 max-h-[420px] overflow-y-auto">
                  {messages.map((m) => {
                    return (
                      <div key={m.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-amber-900/5 transition-colors`}>
                        <button
                          type="button"
                          onClick={() => { setActive(m); setReplyMsg(''); setReplyText(''); }}
                          title={`Chat with ${parseName(m.from_email)}`}
                          className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 flex items-center justify-center text-base shadow-md hover:brightness-110 active:scale-95 transition-all"
                        >
                          💬
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-[#3C2A21] truncate">
                            {m.subject || '(no subject)'}
                          </p>
                          <p className="text-[11px] font-semibold text-amber-900/70 truncate mt-0.5">
                            <span className="text-[#693F27]">{parseName(m.from_email)}</span>
                            {parseEmail(m.from_email) ? ` · ${parseEmail(m.from_email)}` : ''}
                          </p>
                          <p className="text-[10px] text-amber-900/40 font-semibold mt-0.5">
                            {m.parsed_at ? new Date(m.parsed_at).toLocaleString() : ''}
                          </p>
                        </div>
                        {m.po_code && (
                          <span className="px-2 py-0.5 rounded-full bg-[#3C2A21]/10 text-[#693F27] text-[10px] font-extrabold shrink-0">{m.po_code}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {active && (
                <div className="border-t border-amber-900/10 bg-[#FFF9F2]/80">
                  <div className="px-5 py-3 border-b border-amber-900/10 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-[#3C2A21] truncate">Chat · {parseName(active.from_email)}</p>
                      <p className="text-[10px] font-semibold text-amber-900/50 truncate">{parseEmail(active.from_email)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setActive(null); setReplyMsg(''); setReplyText(''); }}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-700 hover:bg-red-500/20 transition-colors"
                    >
                      Close Chat
                    </button>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto p-5 space-y-4">
                    <div className="flex items-end gap-2 justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider">You · Purchase Order Sent</span>
                          {active.parsed_at && (
                            <span className="text-[9px] font-semibold text-amber-200/70">{new Date(active.parsed_at).toLocaleString()}</span>
                          )}
                        </div>
                        {active.subject && (
                          <p className="text-[10px] font-bold text-amber-200/80 mb-1">{active.subject}</p>
                        )}
                        <pre className="whitespace-pre-wrap font-medium font-sans text-[11px] leading-relaxed m-0">
                          This purchase order was emailed to {parseName(active.from_email)} for confirmation.
                        </pre>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#3C2A21] text-amber-100 text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-sm uppercase">You</div>
                    </div>

                    <div className="flex items-end gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C08552] to-[#693F27] text-amber-50 text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-sm uppercase">
                        {initials(parseName(active.from_email))}
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-amber-900/10 text-[#3C2A21] px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/60">Supplier Reply · {parseName(active.from_email)}</span>
                          {active.parsed_at && (
                            <span className="text-[9px] font-semibold text-amber-900/40">{new Date(active.parsed_at).toLocaleString()}</span>
                          )}
                        </div>
                        {active.subject && (
                          <p className="text-[10px] font-bold text-[#693F27] mb-1">{active.subject}</p>
                        )}
                        {active.body ? (
                          <pre className="whitespace-pre-wrap font-medium font-sans text-[11px] leading-relaxed m-0">{active.body}</pre>
                        ) : (
                          <p className="text-[11px] font-medium text-amber-900/50 italic">Supplier replied without a message.</p>
                        )}
                        {parseItems(active.matched_items).length > 0 && (
                          <div className="mt-2">
                            <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 mb-1.5">Delivery Items Confirmed</p>
                            <div className="flex flex-wrap gap-1.5">
                              {parseItems(active.matched_items).map((it, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-emerald-500/10 text-emerald-800 border-emerald-500/20">
                                  {it.quantity} {it.unit} · {it.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {(sentReplies[active.id] || []).map((r, idx) => (
                      <div key={idx} className="flex items-end gap-2 justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider">You · Reply Sent</span>
                            <span className="text-[9px] font-semibold text-amber-200/70">{r.time}</span>
                          </div>
                          <pre className="whitespace-pre-wrap font-medium font-sans text-[11px] leading-relaxed m-0">{r.body}</pre>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#3C2A21] text-amber-100 text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-sm uppercase">You</div>
                      </div>
                    ))}

                    {(sentReplies[active.id] || []).length === 0 && (
                      <p className="text-[10px] font-semibold text-amber-900/40 text-center">Use the reply box below to respond to {parseName(active.from_email)}.</p>
                    )}
                  </div>

                  <div className="px-5 py-4 border-t border-amber-900/10 bg-white/60">
                    {replyMsg && (
                      <div className={`mb-2 p-2 rounded-lg border text-[11px] font-bold ${
                        replyMsg.includes('✓') ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' : 'bg-amber-500/10 text-amber-900 border-amber-500/20'
                      }`}>
                        {replyMsg}
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        placeholder={`Write a reply to ${parseName(active.from_email)}...`}
                        className="flex-1 px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21] resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(active)}
                        disabled={sending || !replyText.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
                      >
                        {sending ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
