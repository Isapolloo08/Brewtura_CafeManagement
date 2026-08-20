import { query } from '../db/index.js';

// Semaphore.co SMS gateway (Philippines) - API v4 client.
// Sends SMS and reads account/transaction info over plain HTTP — no GSM modem needed.
// Docs: https://api.semaphore.co/docs

const BASE_URL = process.env.SEMAPHORE_BASE_URL || 'https://api.semaphore.co/api/v4';

// Config is stored in the settings table (editable from the UI) and can be
// overridden with env vars. Env wins so deployments can hard-pin credentials.
const CONFIG_CACHE_MS = 10000;
let configCache = { at: 0, data: null };

const getSemaphoreConfig = async () => {
  if (Date.now() - configCache.at < CONFIG_CACHE_MS) return configCache.data;
  let fromDb = { semaphore_api_key: '', semaphore_sender_name: '' };
  try {
    const res = await query(
      "SELECT key, value FROM settings WHERE key IN ('semaphore_api_key', 'semaphore_sender_name')"
    );
    for (const row of res.rows) {
      if (row.value) fromDb[row.key] = row.value;
    }
  } catch {
    // DB unavailable — fall through to env-only config.
  }
  const config = {
    apiKey: process.env.SEMAPHORE_API_KEY || fromDb.semaphore_api_key || '',
    senderName: process.env.SEMAPHORE_SENDER_NAME || fromDb.semaphore_sender_name || '',
  };
  configCache = { at: Date.now(), data: config };
  return config;
};

export const semaphoreConfigured = async () => {
  const config = await getSemaphoreConfig();
  return Boolean(config.apiKey);
};

export const getConfiguredSenderName = async () => {
  const config = await getSemaphoreConfig();
  return config.senderName || null;
};

// Called right after the settings table is updated so a newly saved API key is
// picked up immediately instead of waiting out the config cache.
export const invalidateSemaphoreConfig = () => {
  configCache = { at: 0, data: null };
  accountCache = { at: 0, data: null };
  transactionsCache = { at: 0, data: null };
};

// Account + transactions endpoints are rate-limited to 2 calls/minute.
// Keep a generous cache and de-duplicate concurrent calls with single-flight so
// parallel requests (status + stats + polling) never hammer the endpoint.
const CACHE_TTL_MS = 45000;
let accountCache = { at: 0, data: null, inflight: null };
let transactionsCache = { at: 0, data: null, inflight: null };
let rateLimitCooldownUntil = 0;

const cacheGet = (cache) => (Date.now() - cache.at < CACHE_TTL_MS ? cache.data : null);
const cacheSet = (cache, data) => {
  cache.at = Date.now();
  cache.data = data;
  cache.inflight = null;
};

// Run fn once; concurrent callers while it's running get the same promise.
// When Semaphore returns 429 "Too Many Attempts", back off for 35s instead of
// retrying immediately (which keeps tripping the 2-calls-per-minute limit).
const singleFlight = async (cache, fn) => {
  const cached = cacheGet(cache);
  if (cached) return cached;
  if (Date.now() < rateLimitCooldownUntil) {
    throw new Error('Too Many Attempts');
  }
  if (cache.inflight) return cache.inflight;
  cache.inflight = fn().then(
    (data) => {
      cacheSet(cache, data);
      return data;
    },
    (err) => {
      cache.inflight = null;
      if (/too many attempts|429/i.test(String(err.message))) {
        rateLimitCooldownUntil = Date.now() + 35000;
      }
      throw err;
    }
  );
  return cache.inflight;
};

const buildUrl = async (path, params = {}) => {
  const { apiKey } = await getSemaphoreConfig();
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('apikey', apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  return url;
};

const parseBody = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

export const getSemaphoreAccount = async () => {
  return singleFlight(accountCache, async () => {
    const res = await fetch(await buildUrl('/account'));
    const data = await parseBody(res);
    if (!res.ok) throw new Error(data.error || `Semaphore account error ${res.status}`);
    return data;
  });
};

export const getSemaphoreTransactions = async ({ limit = 100, page = 1 } = {}) => {
  return singleFlight(transactionsCache, async () => {
    const res = await fetch(await buildUrl('/account/transactions', { limit, page }));
    const data = await parseBody(res);
    if (!res.ok) throw new Error(data.error || `Semaphore transactions error ${res.status}`);
    return data;
  });
};

export const sendSemaphoreSms = async ({ to, body }) => {
  const { senderName } = await getSemaphoreConfig();
  const form = new URLSearchParams();
  form.set('number', to);
  form.set('message', body);
  if (senderName) form.set('sendername', senderName);

  const res = await fetch(await buildUrl('/messages'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await parseBody(res);
  if (!res.ok) {
    const detail = Array.isArray(data) ? data.map((m) => m.error || m.message).join('; ') : data.error || data.message;
    throw new Error(detail || `Semaphore send error ${res.status}`);
  }
  const msg = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    messageId: msg?.message_id ?? msg?.id ?? null,
    status: msg?.status || 'Sent',
    network: msg?.network || null,
    recipient: msg?.recipient || to,
    raw: msg,
  };
};

// Build a usage summary: account balance + this-month transaction totals.
export const getSemaphoreStats = async () => {
  const [account, transactions] = await Promise.all([
    getSemaphoreAccount(),
    getSemaphoreTransactions({ limit: 100, page: 1 }),
  ]);

  const now = new Date();
  const monthPrefix = now.toISOString().slice(0, 7);
  let sentThisMonth = 0;
  let receivedThisMonth = 0;
  let totalSpent = 0;

  const rows = Array.isArray(transactions) ? transactions : [];
  for (const tx of rows) {
    const created = (tx.created_at || '').slice(0, 7);
    if (created !== monthPrefix) continue;
    const type = String(tx.type || '').toLowerCase();
    if (type.includes('send') || type.includes('sms')) sentThisMonth += 1;
    if (type.includes('receive') || type.includes('inbound')) receivedThisMonth += 1;
    const amount = parseFloat(tx.amount || 0);
    if (amount < 0) totalSpent += Math.abs(amount);
  }

  return {
    accountId: account.account_id || null,
    accountName: account.account_name || null,
    status: account.status || 'Unknown',
    creditBalance: account.credit_balance ?? null,
    sentThisMonth,
    receivedThisMonth,
    totalSpent,
    rawAccount: account,
  };
};