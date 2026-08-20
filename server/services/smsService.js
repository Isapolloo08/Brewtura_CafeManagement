import { query } from '../db/index.js';
import { emitSupplierMessage } from './socketService.js';
import { analyzeMessage, extractPoCode } from './gmailService.js';
import {
  semaphoreConfigured,
  getConfiguredSenderName,
  getSemaphoreAccount,
  getSemaphoreStats,
  sendSemaphoreSms,
} from './semaphoreService.js';

// Extend supplier_messages with SMS-specific columns (safe to run on every boot).
const ensureTables = async () => {
  try {
    await query(`ALTER TABLE supplier_messages ADD COLUMN IF NOT EXISTS channel VARCHAR(10) NOT NULL DEFAULT 'email'`);
    await query(`ALTER TABLE supplier_messages ADD COLUMN IF NOT EXISTS from_phone VARCHAR(20)`);
    await query(`ALTER TABLE supplier_messages ADD COLUMN IF NOT EXISTS sms_index INTEGER`);
  } catch (err) {
    console.warn('ensureTables (sms) skipped:', err.message);
  }
};

ensureTables();

// Provider selection: Semaphore (cloud HTTP API) wins when configured, otherwise
// fall back to the local GSM bridge. This is the single place that picks a backend.
const BRIDGE_URL = (process.env.SMS_BRIDGE_URL || 'http://127.0.0.1:8008').replace(/\/+$/, '');
const BRIDGE_TOKEN = process.env.SMS_BRIDGE_TOKEN || '';
const POLL_INTERVAL_MS = parseInt(process.env.SMS_POLL_INTERVAL_MS || '5000', 10);

export const smsProvider = async () => (await semaphoreConfigured() ? 'semaphore' : 'bridge');

export const smsConfigured = async () => Boolean((await semaphoreConfigured()) || process.env.SMS_BRIDGE_URL);

const bridgeFetch = async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (BRIDGE_TOKEN) headers.Authorization = `Bearer ${BRIDGE_TOKEN}`;
  const res = await fetch(`${BRIDGE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `SMS bridge error ${res.status}`);
  return data;
};

export const smsStatus = async () => {
  if (await semaphoreConfigured()) {
    try {
      const account = await getSemaphoreAccount();
      return {
        provider: 'semaphore',
        connected: true,
        accountName: account.account_name || null,
        accountId: account.account_id || null,
        status: account.status || 'Unknown',
        creditBalance: account.credit_balance ?? null,
        sendername: await getConfiguredSenderName(),
        port: null,
        signal: null,
      };
    } catch (err) {
      return {
        provider: 'semaphore',
        connected: false,
        error: err.message,
        creditBalance: null,
        port: null,
        signal: null,
      };
    }
  }

  try {
    const data = await bridgeFetch('/api/sms/status');
    return { provider: 'bridge', connected: true, ...data, port: data.port || 'COM4' };
  } catch (err) {
    return { provider: 'bridge', connected: false, error: err.message };
  }
};

export const smsStats = async () => {
  if (await semaphoreConfigured()) {
    try {
      return { provider: 'semaphore', ...(await getSemaphoreStats()) };
    } catch (err) {
      return { provider: 'semaphore', error: err.message, creditBalance: null, sentThisMonth: 0 };
    }
  }
  const status = await smsStatus();
  return {
    provider: 'bridge',
    connected: status.connected,
    creditBalance: null,
    sentThisMonth: 0,
    receivedThisMonth: 0,
    error: status.connected ? null : status.error,
  };
};

export const sendSms = async ({ to, body }) => {
  if (await semaphoreConfigured()) {
    return sendSemaphoreSms({ to, body });
  }
  const data = await bridgeFetch('/api/sms/send', {
    method: 'POST',
    body: JSON.stringify({ to, body }),
  });
  if (!data.ok) throw new Error(data.error || 'SMS send failed');
  return data;
};

export const receiveSms = async () => {
  if (await semaphoreConfigured()) return [];
  const data = await bridgeFetch('/api/sms/receive');
  return data.messages || [];
};

const smsDedupKey = (msg) => `sms:${msg.number}:${msg.timestamp || msg.index}`;

export const saveSmsMessages = async (messages) => {
  const saved = [];
  for (const msg of messages) {
    try {
      const poCode = extractPoCode(msg.body || '');
      const result = await query(
        `INSERT INTO supplier_messages (gmail_message_id, from_phone, subject, body, po_code, matched_items, channel, sms_index, parsed_at)
         VALUES ($1, $2, $3, $4, $5, NULL, 'sms', $6, now())
         ON CONFLICT (gmail_message_id) DO NOTHING
         RETURNING *`,
        [smsDedupKey(msg), msg.number, null, msg.body, poCode, msg.index]
      );
      if (result.rows[0]) {
        const analyzed = await analyzeMessage(result.rows[0]);
        saved.push(analyzed);
        emitSupplierMessage(analyzed);
      }
    } catch (err) {
      console.warn('Failed to save SMS supplier message', err);
    }
  }
  return saved;
};

export const getSmsMessages = async () => {
  const result = await query(
    "SELECT * FROM supplier_messages WHERE channel = 'sms' ORDER BY parsed_at DESC LIMIT 50"
  );
  return result.rows;
};

export const saveSentSms = async ({ to, body, poCode }) => {
  const result = await query(
    `INSERT INTO supplier_messages (gmail_message_id, from_phone, subject, body, po_code, channel, direction, parsed_at)
     VALUES ($1, $2, $3, $4, $5, 'sms', 'out', now())
     RETURNING *`,
    [smsDedupKey({ number: to, timestamp: Date.now(), index: null }), to, null, body, poCode]
  );
  return result.rows[0];
};

let smsPollTimer = null;

export const startSmsPolling = async (intervalMs = POLL_INTERVAL_MS) => {
  if (!(await smsConfigured())) {
    console.log('SMS not configured — set SEMAPHORE_API_KEY (cloud) or SMS_BRIDGE_URL (modem) to enable');
    return;
  }
  if (await semaphoreConfigured()) {
    console.log('📱 SMS gateway: Semaphore (cloud) — inbound SMS arrive via webhook, no polling needed');
    return;
  }
  const status = await smsStatus();
  if (!status.connected) {
    console.log(`SMS bridge unreachable at ${BRIDGE_URL} — polling paused. Start sms/bridge.py.`);
    return;
  }
  if (smsPollTimer) clearInterval(smsPollTimer);
  smsPollTimer = setInterval(async () => {
    try {
      const messages = await receiveSms();
      if (messages.length > 0) {
        const saved = await saveSmsMessages(messages);
        console.log(`📩 SMS auto-poll saved ${saved.length} new supplier message(s)`);
      }
    } catch (err) {
      console.warn('SMS auto-poll error:', err.message);
    }
  }, intervalMs);
  console.log(`📩 SMS auto-polling started every ${intervalMs / 1000}s`);
};

export const stopSmsPolling = () => {
  if (smsPollTimer) {
    clearInterval(smsPollTimer);
    smsPollTimer = null;
  }
};