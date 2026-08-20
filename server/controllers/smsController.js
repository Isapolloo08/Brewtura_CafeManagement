import {
  smsStatus,
  smsStats,
  sendSms,
  receiveSms,
  saveSmsMessages,
  getSmsMessages,
  saveSentSms,
  smsProvider,
} from '../services/smsService.js';
import { query } from '../db/index.js';

export const smsStatusHandler = async (req, res) => {
  try {
    res.json(await smsStatus());
  } catch (err) {
    console.error('smsStatus error:', err);
    res.status(500).json({ error: 'Failed to get SMS status' });
  }
};

export const smsStatsHandler = async (req, res) => {
  try {
    res.json(await smsStats());
  } catch (err) {
    console.error('smsStats error:', err);
    res.status(500).json({ error: 'Failed to get SMS usage stats: ' + err.message });
  }
};

export const smsPoll = async (req, res) => {
  try {
    const messages = await receiveSms();
    const saved = await saveSmsMessages(messages);
    res.json({ scanned: messages.length, newlySaved: saved.length, messages });
  } catch (err) {
    console.error('smsPoll error:', err);
    res.status(500).json({ error: 'Failed to poll SMS: ' + err.message });
  }
};

export const smsMessages = async (req, res) => {
  try {
    const messages = await getSmsMessages();
    res.json(messages);
  } catch (err) {
    console.error('smsMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch SMS supplier messages' });
  }
};

export const smsSend = async (req, res) => {
  const { to, supplierId, body, poCode } = req.body;
  if ((!to && !supplierId) || !body) {
    return res.status(400).json({ error: 'to (or supplierId) and body are required' });
  }
  try {
    let phone = to;
    if (!phone && supplierId) {
      const supplier = await query('SELECT phone FROM suppliers WHERE id = $1', [supplierId]);
      phone = supplier.rows[0]?.phone;
      if (!phone) return res.status(404).json({ error: 'Supplier has no phone number on file' });
    }
    const result = await sendSms({ to: phone, body });
    const saved = await saveSentSms({ to: phone, body, poCode });
    res.json({ success: true, provider: await smsProvider(), ...result, saved });
  } catch (err) {
    console.error('smsSend error:', err);
    res.status(500).json({ error: 'Failed to send SMS: ' + err.message });
  }
};

// Inbound webhook (Semaphore posts received SMS here). Public — Semaphore calls it with a secret.
export const smsWebhook = async (req, res) => {
  try {
    const secret = process.env.SEMAPHORE_WEBHOOK_SECRET;
    if (secret && req.query.secret !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const body = req.body || {};
    const messages = Array.isArray(body) ? body : [body];
    const normalized = messages
      .filter((m) => m && (m.from || m.message || m.text))
      .map((m) => ({
        number: m.from || m.number || m.recipient,
        body: m.message || m.text || '',
        timestamp: m.timestamp || m.received_at || Date.now(),
        index: m.id || m.message_id || null,
      }));
    const saved = await saveSmsMessages(normalized);
    res.json({ ok: true, received: normalized.length, saved: saved.length });
  } catch (err) {
    console.error('smsWebhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed: ' + err.message });
  }
};