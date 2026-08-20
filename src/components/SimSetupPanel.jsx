import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import { Icons } from './Icons';

// Helper to translate CSQ signal to descriptive bar meter (bridge / modem mode only)
function parseSignal(signalStr) {
  if (!signalStr) return { level: 0, label: 'Unknown', raw: '-' };
  const match = signalStr.match(/\+CSQ:\s*(\d+)/i) || signalStr.match(/(\d+)/);
  if (!match) return { level: 0, label: 'Unknown', raw: signalStr };
  const rssi = parseInt(match[1], 10);
  if (rssi === 99 || isNaN(rssi)) return { level: 0, label: 'No Signal', raw: `${rssi}` };
  if (rssi >= 20) return { level: 4, label: 'Excellent', raw: `${rssi} / 31` };
  if (rssi >= 15) return { level: 3, label: 'Good', raw: `${rssi} / 31` };
  if (rssi >= 10) return { level: 2, label: 'Fair', raw: `${rssi} / 31` };
  if (rssi >= 2) return { level: 1, label: 'Poor', raw: `${rssi} / 31` };
  return { level: 0, label: 'No Signal', raw: `${rssi} / 31` };
}

const fmtBalance = (balance) => {
  if (balance === null || balance === undefined) return '—';
  return Number(balance).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export function SimSetupPanel({ suppliers = [], compact = false, settings, onUpdateSettings }) {
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pollLoading, setPollLoading] = useState(false);
  const [pollResult, setPollResult] = useState(null);
  const [messages, setMessages] = useState([]);

  // Semaphore account connection state
  const [apiKey, setApiKey] = useState(settings?.semaphoreApiKey || '');
  const [senderName, setSenderName] = useState(settings?.semaphoreSenderName || '');
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState(null);

  // Compose / send state
  const [to, setTo] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [st, msgs, stStats] = await Promise.all([
        api.getSmsStatus().catch((err) => ({ connected: false, error: err.message })),
        api.getSmsMessages().catch(() => []),
        api.getSmsStats().catch(() => null),
      ]);
      setStatus(st);
      setMessages(msgs || []);
      setStats(stStats);
    } catch (err) {
      console.warn('SMS status error:', err);
      setStatus({ connected: false, error: 'Could not connect to SMS gateway' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const refreshStats = async () => {
    setStatsLoading(true);
    try {
      setStats(await api.getSmsStats());
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  };

  const handleConnectSemaphore = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setConnecting(true);
    setConnectMsg(null);
    try {
      await onUpdateSettings({ ...settings, semaphoreApiKey: apiKey.trim(), semaphoreSenderName: senderName.trim() });
      setConnectMsg({ success: true, message: 'Semaphore account saved. Checking balance...' });
      setLoading(true);
      const st = await api.getSmsStatus();
      setStatus(st);
      setLoading(false);
      if (st?.connected) {
        setConnectMsg({ success: true, message: `Connected! Balance: ${fmtBalance(st.creditBalance)} credits` });
        refreshStats();
        api.getSmsMessages().then((msgs) => setMessages(msgs || [])).catch(() => {});
      } else {
        setConnectMsg({ success: false, message: `Connected to provider but balance check failed: ${st?.error || 'unknown error'}` });
      }
    } catch (err) {
      setConnectMsg({ success: false, message: 'Failed to save: ' + (err.message || 'Unknown error') });
    } finally {
      setConnecting(false);
      setLoading(false);
    }
  };

  const handlePoll = async () => {
    setPollLoading(true);
    setPollResult(null);
    try {
      const res = await api.pollSms();
      setPollResult(res);
      const msgs = await api.getSmsMessages().catch(() => []);
      setMessages(msgs || []);
    } catch (err) {
      alert('SMS Scan failed: ' + (err.message || 'Check bridge connection'));
    } finally {
      setPollLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!to || !body) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await api.sendSms({ to, body });
      setSendResult({ success: true, message: `Sent to ${to} (${res.status || 'ok'})` });
      setTo('');
      setBody('');
      refreshStats();
      const msgs = await api.getSmsMessages().catch(() => []);
      setMessages(msgs || []);
      setTimeout(() => setSendResult(null), 4000);
    } catch (err) {
      setSendResult({ success: false, message: err.message || 'Failed to send SMS' });
    } finally {
      setSending(false);
    }
  };

  const signalInfo = parseSignal(status?.signal);
  const provider = status?.provider || 'bridge';
  const isConnected = Boolean(status?.connected);
  const isCloud = provider === 'semaphore';

  return (
    <div className="space-y-6">
      {/* Semaphore Account Connection */}
      <div className="glass-card rounded-3xl border border-white/60 p-6 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
            isConnected && isCloud ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-900/10 text-[#693F27]'
          }`}>
            <Icons.SimCard className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                Connect Semaphore Account
              </h4>
              {isCloud && isConnected && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-500/10 text-emerald-800 border-emerald-500/20">
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900/70 font-medium mt-0.5">
              Enter your Semaphore API key from <span className="font-bold">semaphore.co</span> to send SMS
              over the cloud and see your credit balance here. Get a key under your account settings.
            </p>
          </div>
        </div>

        <form onSubmit={handleConnectSemaphore} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">API Key</label>
            <input
              type="password"
              required
              placeholder="Semaphore API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">
              Sender Name <span className="font-medium text-amber-900/50">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. BREWTURA"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-amber-900/10">
            {connectMsg && (
              <span className={`text-[11px] font-bold ${
                connectMsg.success ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {connectMsg.message}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {isCloud && isConnected && (
                <span className="text-[11px] font-extrabold text-[#693F27] bg-amber-900/5 border border-amber-900/10 px-3 py-1.5 rounded-xl">
                  Balance: {fmtBalance(status?.creditBalance)} credits
                </span>
              )}
              <button
                type="submit"
                disabled={connecting || !apiKey.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {connecting ? 'Connecting...' : (isCloud && isConnected) ? 'Update & Refresh' : 'Connect Account'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Provider Connection Status */}
      <div className="glass-card rounded-3xl border border-white/60 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              isConnected ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-900/10 text-[#693F27]'
            }`}>
              <Icons.SimCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                  SMS Gateway Dashboard
                </h4>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-800 border-amber-500/20'
                }`}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </span>
                {isCloud && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-sky-500/10 text-sky-800 border-sky-500/20">
                    Semaphore Cloud
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-900/70 font-medium mt-0.5">
                {isCloud
                  ? 'Send and receive supplier SMS through the Semaphore API — no modem hardware required.'
                  : 'Send and receive supplier SMS through a local GSM/SIM modem bridge.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={refreshStatus}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-amber-900/10 text-[#693F27] hover:bg-amber-900/20 text-xs font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Checking...' : '↻ Refresh Status'}
            </button>
            <button
              type="button"
              onClick={refreshStats}
              disabled={statsLoading}
              className="px-3.5 py-2 rounded-xl bg-amber-900/10 text-[#693F27] hover:bg-amber-900/20 text-xs font-bold transition-all disabled:opacity-50"
            >
              {statsLoading ? 'Refreshing...' : '↻ Refresh Credits'}
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-amber-900/10">
          <div className="p-3 rounded-2xl bg-amber-900/5 border border-amber-900/5">
            <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Provider</p>
            <p className="text-xs font-extrabold text-[#3C2A21] mt-0.5 capitalize">
              {isCloud ? 'Semaphore' : 'GSM Modem Bridge'}
            </p>
          </div>

          {isCloud ? (
            <>
              <div className="p-3 rounded-2xl bg-amber-900/5 border border-amber-900/5">
                <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Account</p>
                <p className="text-xs font-extrabold text-[#3C2A21] mt-0.5 truncate" title={status?.accountName}>
                  {status?.accountName || '—'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-900/5 border border-amber-900/5">
                <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Sender Name</p>
                <p className="text-xs font-extrabold text-[#3C2A21] mt-0.5">
                  {status?.sendername || 'Default'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-900/5 border border-amber-900/5">
                <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Account Status</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  <p className="text-xs font-extrabold text-[#3C2A21]">{status?.status || '—'}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-amber-900/5 border border-amber-900/5">
                <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Modem Port</p>
                <p className="text-xs font-extrabold text-[#3C2A21] mt-0.5">
                  {status?.port || 'COM4'} <span className="text-[10px] font-medium text-amber-900/60">({status?.baud || 9600} baud)</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-900/5 border border-amber-900/5">
                <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">SIM State</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  <p className="text-xs font-extrabold text-[#3C2A21]">
                    {status?.sim_state ? status.sim_state.replace('+CPIN:', '').trim() : (isConnected ? 'READY' : 'Waiting')}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-900/5 border border-amber-900/5">
                <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Signal Strength</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-end gap-0.5 h-3">
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className={`w-1 rounded-sm transition-all ${
                          bar <= signalInfo.level ? 'bg-emerald-600' : 'bg-amber-900/20'
                        }`}
                        style={{ height: `${bar * 25}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-extrabold text-[#3C2A21]">
                    {signalInfo.label} <span className="text-[10px] text-amber-900/50">({signalInfo.raw})</span>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-900/5 border border-amber-900/5">
                <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Device Model</p>
                <p className="text-xs font-extrabold text-[#3C2A21] mt-0.5 truncate" title={status?.model || status?.manufacturer}>
                  {status?.model || status?.manufacturer || (isConnected ? 'GSM USB Modem' : 'Offline')}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Warning if disconnected */}
        {!isConnected && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-[#4A2E2A] flex items-start gap-2.5">
            <span className="text-amber-800 text-base leading-none">⚠️</span>
            <div>
              {isCloud ? (
                <>
                  <p className="font-bold text-[#3C2A21]">Semaphore gateway is not connected.</p>
                  <p className="text-[11px] text-amber-900/70 mt-0.5">
                    Add your <code className="px-1.5 py-0.5 bg-amber-900/10 rounded font-mono font-bold text-[#3C2A21]">SEMAPHORE_API_KEY</code> to the .env file and restart the backend.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-[#3C2A21]">SMS hardware bridge is not running or modem is disconnected.</p>
                  <p className="text-[11px] text-amber-900/70 mt-0.5">
                    Plug in your USB GSM Modem and run <code className="px-1.5 py-0.5 bg-amber-900/10 rounded font-mono font-bold text-[#3C2A21]">python sms/bridge.py</code>, or switch to Semaphore with SEMAPHORE_API_KEY.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bridge-only: scan SIM inbox */}
        {!isCloud && isConnected && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handlePoll}
              disabled={pollLoading}
              className="px-4 py-2 rounded-xl bg-amber-900/10 text-[#693F27] hover:bg-amber-900/20 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Icons.Signal className="w-3.5 h-3.5" />
              <span>{pollLoading ? 'Scanning SIM card...' : 'Scan SIM Messages Now'}</span>
            </button>
            {pollResult && (
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                Scanned {pollResult.scanned} SMS, newly saved {pollResult.newlySaved}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Usage / Credits Stats */}
      {isCloud && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-card rounded-3xl border border-white/60 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Icons.CreditCard className="w-4 h-4 text-emerald-700" />
              <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Credit Balance</p>
            </div>
            <p className="font-heading font-extrabold text-2xl text-[#3C2A21] mt-1.5">
              {fmtBalance(stats?.creditBalance ?? status?.creditBalance)}
            </p>
            <p className="text-[10px] font-semibold text-amber-900/50">1 credit = 1 SMS</p>
          </div>

          <div className="glass-card rounded-3xl border border-white/60 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Icons.Phone className="w-4 h-4 text-emerald-700" />
              <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Sent This Month</p>
            </div>
            <p className="font-heading font-extrabold text-2xl text-[#3C2A21] mt-1.5">
              {stats?.sentThisMonth ?? '—'}
            </p>
            <p className="text-[10px] font-semibold text-amber-900/50">messages transmitted</p>
          </div>

          <div className="glass-card rounded-3xl border border-white/60 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Icons.Mail className="w-4 h-4 text-emerald-700" />
              <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Received This Month</p>
            </div>
            <p className="font-heading font-extrabold text-2xl text-[#3C2A21] mt-1.5">
              {stats?.receivedThisMonth ?? '—'}
            </p>
            <p className="text-[10px] font-semibold text-amber-900/50">supplier replies ingested</p>
          </div>

          <div className="glass-card rounded-3xl border border-white/60 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Icons.ChartBar className="w-4 h-4 text-emerald-700" />
              <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wider">Est. Cost (Month)</p>
            </div>
            <p className="font-heading font-extrabold text-2xl text-[#3C2A21] mt-1.5">
              ₱{fmtBalance(stats?.totalSpent ?? 0)}
            </p>
            <p className="text-[10px] font-semibold text-amber-900/50">credits consumed</p>
          </div>
        </div>
      )}

      {/* Send SMS Form */}
      <div className="glass-card rounded-3xl border border-white/60 p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-amber-900/10 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-900/10 text-[#693F27] flex items-center justify-center">
            <Icons.Phone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">Compose SMS</h4>
            <p className="text-xs text-amber-900/70 font-medium">
              Send a purchase order notification or reply to a supplier via {isCloud ? 'Semaphore' : 'GSM modem'}.
            </p>
          </div>
        </div>

        <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Recipient Phone</label>
            <input
              type="text"
              required
              placeholder="+639171234567 or 09171234567"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
            />
            {suppliers && suppliers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold text-amber-900/50 w-full">Quick pick supplier:</span>
                {suppliers.filter((s) => s.phone).slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTo(s.phone)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-amber-900/5 hover:bg-amber-900/10 text-amber-900 font-bold border border-amber-900/10"
                  >
                    {s.name} ({s.phone})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">
              Message Content (Max 160 chars per segment)
            </label>
            <textarea
              rows={3}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl glass-input font-medium text-[#3C2A21]"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-amber-900/50 font-bold">
                {Math.ceil(body.length / 160)} segment(s) · {body.length} / 160 per segment
              </p>
              {sendResult && (
                <span className={`text-[11px] font-bold ${
                  sendResult.success ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {sendResult.message}
                </span>
              )}
            </div>
          </div>

          <div className="md:col-span-3 flex items-center justify-end gap-2 pt-2 border-t border-amber-900/10">
            <button
              type="submit"
              disabled={sending || !to || !body}
              className="px-6 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Icons.Phone className="w-3.5 h-3.5" />
              {sending ? 'Transmitting...' : 'Send SMS'}
            </button>
          </div>
        </form>
      </div>

      {/* Message History Log */}
      {messages.length > 0 && !compact && (
        <div className="glass-card rounded-3xl border border-white/60 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-extrabold text-base text-[#3C2A21]">
              Message History ({messages.length})
            </h4>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">
              {isCloud ? 'Cloud Gateway' : 'Live Hardware'} Log
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id || m.gmail_message_id}
                className="p-3 rounded-2xl bg-amber-900/5 border border-amber-900/10 flex flex-col gap-1.5 text-xs hover:bg-amber-900/[0.07] transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                      m.direction === 'out'
                        ? 'bg-sky-500/10 text-sky-800 border border-sky-500/20'
                        : 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20'
                    }`}>
                      {m.direction === 'out' ? 'Out' : 'In'}
                    </span>
                    <span className="font-extrabold text-[#3C2A21] flex items-center gap-1">
                      <Icons.Phone className="w-3 h-3 text-amber-900/50" />
                      {m.from_phone || m.from_email || 'Supplier'}
                    </span>
                    {m.po_code && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-900/10 text-[#693F27] font-extrabold text-[10px]">
                        {m.po_code}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-amber-900/50 font-medium">
                    {m.parsed_at ? new Date(m.parsed_at).toLocaleDateString() + ' ' + new Date(m.parsed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 font-medium whitespace-pre-wrap">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}