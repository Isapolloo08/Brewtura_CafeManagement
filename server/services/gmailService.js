import crypto from 'crypto';
import { query } from '../db/index.js';
import { emitSupplierMessage } from './socketService.js';
import { analyzeSupplierReply, stripQuotedReply } from './poAnalyzer.js';
import { analyzeSupplierReplyWithRag, ragConfigured } from './ragAnalyzer.js';

// Auto-create Gmail tables if missing (safe to run on every boot).
const ensureTables = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS gmail_accounts (
        id                SERIAL PRIMARY KEY,
        email             VARCHAR(150) NOT NULL,
        access_token      TEXT,
        refresh_token     TEXT,
        token_expires_at  TIMESTAMPTZ,
        is_active         BOOLEAN NOT NULL DEFAULT true,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS supplier_messages (
        id                SERIAL PRIMARY KEY,
        gmail_message_id  VARCHAR(255) UNIQUE,
        from_email        VARCHAR(150),
        subject           TEXT,
        body              TEXT,
        po_code           VARCHAR(20),
        matched_items     JSONB,
        direction         VARCHAR(10) NOT NULL DEFAULT 'in',
        in_reply_to       VARCHAR(255),
        parsed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await query(`ALTER TABLE supplier_messages ADD COLUMN IF NOT EXISTS direction VARCHAR(10) NOT NULL DEFAULT 'in'`);
    await query(`ALTER TABLE supplier_messages ADD COLUMN IF NOT EXISTS in_reply_to VARCHAR(255)`);
    await query(`ALTER TABLE supplier_messages ADD COLUMN IF NOT EXISTS verdict VARCHAR(20)`);
    await query(`ALTER TABLE supplier_messages ADD COLUMN IF NOT EXISTS analysis JSONB`);
    await query(`ALTER TABLE supplier_messages ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ`);
    await query(`ALTER TABLE supplier_messages ADD COLUMN IF NOT EXISTS stocked_at TIMESTAMPTZ`);
  } catch (err) {
    console.warn('ensureTables (gmail) skipped:', err.message);
  }
};

ensureTables();

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/v1/gmail/callback';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

export const gmailConfigured = () => Boolean(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET);

export const buildAuthUrl = (state = '') => {
  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });
  if (state) params.set('state', state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const tokenParams = (codeOrRefresh, grantType) => {
  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    client_secret: GMAIL_CLIENT_SECRET,
  });
  if (grantType === 'authorization_code') {
    params.set('code', codeOrRefresh);
    params.set('grant_type', 'authorization_code');
    params.set('redirect_uri', GMAIL_REDIRECT_URI);
  } else {
    params.set('refresh_token', codeOrRefresh);
    params.set('grant_type', 'refresh_token');
  }
  return params;
};

export const exchangeCodeForTokens = async (code) => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams(code, 'authorization_code'),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
};

const refreshAccessToken = async (refreshToken) => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams(refreshToken, 'refresh_token'),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
};

const getActiveAccount = async () => {
  const result = await query('SELECT * FROM gmail_accounts WHERE is_active = true ORDER BY id ASC LIMIT 1');
  return result.rows[0] || null;
};

const getValidAccessToken = async (account) => {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60000) return account.access_token;
  if (!account.refresh_token) throw new Error('No refresh token available. Reconnect Gmail.');
  const tokens = await refreshAccessToken(account.refresh_token);
  const expiresIn = (tokens.expires_in || 3600) * 1000;
  await query(
    `UPDATE gmail_accounts
     SET access_token = $1, token_expires_at = now() + ($2 * interval '1 millisecond')
     WHERE id = $3`,
    [tokens.access_token, expiresIn, account.id]
  );
  return tokens.access_token;
};

const gmailFetch = async (accessToken, url) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail API error: ${res.status} ${await res.text()}`);
  return res.json();
};

export const getGmailProfile = async (accessToken) => {
  return gmailFetch(accessToken, 'https://gmail.googleapis.com/gmail/v1/users/me/profile');
};

const encodeRFC822Message = ({ to, subject, body, cc, inReplyTo, references }) => {
  const lines = [];
  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  lines.push(`Subject: ${subject}`);
  if (inReplyTo) lines.push(`In-Reply-To: <${inReplyTo}>`);
  if (references) lines.push(`References: <${references}>`);
  lines.push('Content-Type: text/plain; charset=UTF-8');
  lines.push('MIME-Version: 1.0');
  lines.push('Date: ' + new Date().toUTCString());
  lines.push('Message-ID: <' + crypto.randomUUID() + '@coffeeshop.local>');
  lines.push('');
  lines.push(body);
  const raw = lines.join('\r\n');
  return Buffer.from(raw).toString('base64url');
};

export const sendEmail = async ({ to, subject, body, cc, messageId }) => {
  const account = await getActiveAccount();
  if (!account) throw new Error('No Gmail account connected.');
  const accessToken = await getValidAccessToken(account);
  const raw = encodeRFC822Message({
    to,
    subject,
    body,
    cc,
    inReplyTo: messageId,
    references: messageId,
  });
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`);
  return res.json();
};

export const listSupplierMessages = async () => {
  const account = await getActiveAccount();
  if (!account) return { account: null, messages: [] };
  const accessToken = await getValidAccessToken(account);

  const suppliers = await query('SELECT email FROM suppliers WHERE is_active = true AND email IS NOT NULL');
  const supplierEmails = suppliers.rows.map(r => r.email.toLowerCase()).filter(Boolean);

  const q = 'in:inbox newer_than:30d';
  const list = await gmailFetch(
    accessToken,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(q)}`
  );

  const messages = [];
  for (const msg of (list.messages || []).slice(0, 20)) {
    try {
      const full = await gmailFetch(
        accessToken,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`
      );
      const parsed = parseMessage(full);
      if (!parsed) continue;

      const fromEmail = extractEmail(parsed.from);
      const isSupplier = supplierEmails.length === 0 || (fromEmail && supplierEmails.includes(fromEmail));
      messages.push({
        gmailMessageId: msg.id,
        fromEmail: parsed.from,
        subject: parsed.subject,
        body: parsed.body,
        poCode: parsed.poCode,
        matchedItems: parsed.matchedItems || null,
        isSupplier,
      });
    } catch (err) {
      console.warn('Failed to parse Gmail message', msg.id, err);
    }
  }
  return { account, messages };
};

export const listNewSupplierMessages = async () => {
  const account = await getActiveAccount();
  if (!account) return { account: null, messages: [] };
  const accessToken = await getValidAccessToken(account);

  const suppliers = await query('SELECT email FROM suppliers WHERE is_active = true AND email IS NOT NULL');
  const supplierEmails = suppliers.rows.map(r => r.email.toLowerCase()).filter(Boolean);

  const q = 'in:inbox newer_than:7d';
  const list = await gmailFetch(
    accessToken,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(q)}`
  );

  const ids = (list.messages || []).slice(0, 20).map(m => m.id);
  if (ids.length === 0) return { account, messages: [] };

  const existing = await query('SELECT gmail_message_id FROM supplier_messages WHERE gmail_message_id = ANY($1)', [ids]);
  const existingIds = new Set(existing.rows.map(r => r.gmail_message_id));
  const newIds = ids.filter(id => !existingIds.has(id));
  if (newIds.length === 0) return { account, messages: [] };

  const messages = [];
  for (const id of newIds) {
    try {
      const full = await gmailFetch(
        accessToken,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`
      );
      const parsed = parseMessage(full);
      if (!parsed) continue;

      const fromEmail = extractEmail(parsed.from);
      const isSupplier = supplierEmails.length === 0 || (fromEmail && supplierEmails.includes(fromEmail));
      messages.push({
        gmailMessageId: id,
        fromEmail: parsed.from,
        subject: parsed.subject,
        body: parsed.body,
        poCode: parsed.poCode,
        matchedItems: parsed.matchedItems || null,
        isSupplier,
      });
    } catch (err) {
      console.warn('Failed to parse new Gmail message', id, err);
    }
  }
  return { account, messages };
};

export const saveSupplierMessages = async (messages) => {
  const saved = [];
  for (const msg of messages) {
    try {
      const result = await query(
        `INSERT INTO supplier_messages (gmail_message_id, from_email, subject, body, po_code, matched_items, parsed_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (gmail_message_id) DO NOTHING
         RETURNING *`,
        [msg.gmailMessageId, msg.fromEmail, msg.subject, msg.body, msg.poCode, JSON.stringify(msg.matchedItems || null)]
      );
      if (result.rows[0]) {
        const analyzed = await analyzeMessage(result.rows[0]);
        saved.push(analyzed);
        emitSupplierMessage(analyzed);
      }
    } catch (err) {
      console.warn('Failed to save supplier message', err);
    }
  }
  return saved;
};

// Normalize a PO code (strip non-alphanumerics, uppercase) for safe matching.
const normalizePoCode = (code = '') =>
  String(code).replace(/[^0-9a-z]/gi, '').toUpperCase();

// Run the rule-based analyzer on a saved supplier message, persist the verdict,
// and auto-advance the linked PO status when the supplier agreed.
export const analyzeMessage = async (message) => {
  if (!message || message.direction === 'out') return message;
  try {
    const po = await query(
      "SELECT * FROM po_records WHERE translate(po_code, '- ', '') = $1",
      [normalizePoCode(message.po_code)]
    ).then(r => r.rows[0]).catch(() => null);

    let replyItems = [];
    if (typeof message.matched_items === 'string') {
      try { replyItems = JSON.parse(message.matched_items) || []; } catch { replyItems = []; }
    } else if (Array.isArray(message.matched_items)) {
      replyItems = message.matched_items;
    }

    let analysis = null;
    const cleanBody = stripQuotedReply(message.body || '');
    if (await ragConfigured()) {
      try {
        analysis = await analyzeSupplierReplyWithRag({
          body: cleanBody,
          subject: message.subject || '',
          orderedItems: (po && po.items) || [],
        });
        console.log(`🤖 RAG (${analysis.verdict}) for message ${message.id}`);
        // If the LLM is unsure, let the rule-based analyzer (which now has
        // Tagalog keyword coverage) rescue the classification.
        if (analysis.verdict === 'unclear') {
          const rule = analyzeSupplierReply({
            body: cleanBody,
            subject: message.subject || '',
            orderedItems: (po && po.items) || [],
            replyItems,
          });
          if (rule.verdict !== 'unclear') {
            analysis = { ...rule, source: 'llm+rule' };
            console.log(`↩️  RAG unclear, rule-based rescued to ${rule.verdict}`);
          }
        }
      } catch (err) {
        console.warn(`RAG analysis failed (${err.message}), falling back to rule-based`);
        analysis = null;
      }
    }
    if (!analysis) {
      analysis = analyzeSupplierReply({
        body: cleanBody,
        subject: message.subject || '',
        orderedItems: (po && po.items) || [],
        replyItems,
      });
    }

    const updated = await query(
      `UPDATE supplier_messages
       SET verdict = $1, analysis = $2, analyzed_at = now()
       WHERE id = $3 RETURNING *`,
      [analysis.verdict, JSON.stringify(analysis), message.id]
    );

    if (analysis.verdict === 'agreed' && po && po.status === 'Pending Approval') {
      await query(
        `UPDATE po_records SET status = 'In Transit' WHERE po_code = $1`,
        [po.po_code]
      );
    }

    return updated.rows[0] || { ...message, verdict: analysis.verdict, analysis };
  } catch (err) {
    console.warn('analyzeMessage error:', err);
    return message;
  }
};

// Persist a stocked flag on a message so the UI can hide the approve action.
export const markMessageStocked = async (messageId) => {
  const result = await query(
    `UPDATE supplier_messages SET stocked_at = now() WHERE id = $1 RETURNING *`,
    [messageId]
  );
  return result.rows[0];
};

export const saveSentMessage = async ({ gmailMessageId, fromEmail, subject, body, poCode, inReplyTo }) => {
  const result = await query(
    `INSERT INTO supplier_messages (gmail_message_id, from_email, subject, body, po_code, direction, in_reply_to, parsed_at)
     VALUES ($1, $2, $3, $4, $5, 'out', $6, now())
     RETURNING *`,
    [gmailMessageId, fromEmail || null, subject, body, poCode, inReplyTo || null]
  );
  return result.rows[0];
};

export const getSavedMessages = async () => {
  const result = await query(
    'SELECT * FROM supplier_messages ORDER BY parsed_at DESC LIMIT 50'
  );
  return result.rows;
};

export const disconnectGmail = async () => {
  await query('UPDATE gmail_accounts SET is_active = false WHERE is_active = true');
};

// --- AUTO POLLING (real-time delivery) ---

let autoPollTimer = null;

export const startAutoPolling = (intervalMs = 10000) => {
  if (autoPollTimer) clearInterval(autoPollTimer);
  autoPollTimer = setInterval(async () => {
    try {
      const account = await getActiveAccount();
      if (!account) return;
      const { messages } = await listNewSupplierMessages();
      if (messages.length > 0) {
        const saved = await saveSupplierMessages(messages);
        console.log(`📥 Auto-poll saved ${saved.length} new supplier message(s)`);
      }
    } catch (err) {
      console.warn('Auto-poll Gmail error:', err.message);
    }
  }, intervalMs);
  console.log(`⏱️  Gmail auto-polling started every ${intervalMs / 1000}s`);
};

export const stopAutoPolling = () => {
  if (autoPollTimer) {
    clearInterval(autoPollTimer);
    autoPollTimer = null;
  }
};

// --- PARSING ---

const decodeBody = (payload) => {
  const parts = [];
  const collect = (node) => {
    if (node.mimeType === 'text/plain' && node.body?.data) {
      parts.push(Buffer.from(node.body.data, 'base64url').toString('utf8'));
    }
    (node.parts || []).forEach(collect);
  };
  collect(payload);
  return parts.join('\n');
};

const parseHeaders = (headers = []) => {
  const get = (name) => {
    const h = headers.find(x => x.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
  };
  return { subject: get('Subject'), from: get('From') };
};

const extractEmail = (from) => {
  const m = (from || '').match(/<([^>]+)>/);
  return m ? m[1].toLowerCase().trim() : (from || '').toLowerCase().trim();
};

const PO_CODE_RE = /\bPO[- ]?\d{3,6}\b/i;
export const extractPoCode = (text) => {
  const m = text.match(PO_CODE_RE);
  return m ? m[0].replace(/[^0-9PO]/gi, '').toUpperCase() : null;
};

export const parseMessage = (full) => {
  if (!full?.payload) return null;
  const { subject, from } = parseHeaders(full.payload.headers);
  const body = decodeBody(full.payload);
  const text = `${subject}\n${body}`;

  const poCode = extractPoCode(text);
  if (!poCode) return null;

  const matchedItems = extractItems(`${subject}\n${stripQuotedReply(body)}`);
  return { subject, from, body, poCode, matchedItems };
};

const extractItems = (text) => {
  // Heuristic: look for lines containing a quantity + a common unit token.
  const unitRe = /\b(kg|g|L|mL|pcs|units|bottles|packs|boxes)\b/i;
  const lines = text.split(/\r?\n/);
  const items = [];
  for (const line of lines) {
    const unitMatch = line.match(unitRe);
    if (!unitMatch) continue;
    const qtyMatch = line.match(/(-?\d+(?:[.,]\d+)?)/);
    if (!qtyMatch) continue;
    const name = line
      .replace(unitRe, ' ')
      .replace(qtyMatch[0], ' ')
      .replace(/[-–—:]+/g, ' ')
      .replace(/[|,]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (name.length >= 3 && name.length <= 80) {
      items.push({
        name,
        quantity: parseFloat(qtyMatch[0].replace(',', '.')),
        unit: unitMatch[0],
      });
    }
  }
  return items.slice(0, 30);
};
