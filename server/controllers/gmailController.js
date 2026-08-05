import {
  gmailConfigured,
  buildAuthUrl,
  exchangeCodeForTokens,
  getGmailProfile,
  listSupplierMessages,
  saveSupplierMessages,
  saveSentMessage,
  getSavedMessages,
  disconnectGmail,
  sendEmail,
} from '../services/gmailService.js';
import { query } from '../db/index.js';

export const gmailStatus = async (req, res) => {
  try {
    const result = await query('SELECT id, email, is_active FROM gmail_accounts WHERE is_active = true ORDER BY id ASC LIMIT 1');
    res.json({
      configured: gmailConfigured(),
      connected: result.rows.length > 0,
      account: result.rows[0] || null,
    });
  } catch (err) {
    console.error('gmailStatus error:', err);
    res.status(500).json({ error: 'Failed to get Gmail status' });
  }
};

export const gmailAuthUrl = async (req, res) => {
  if (!gmailConfigured()) {
    return res.status(400).json({ error: 'Gmail OAuth not configured on the server. Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to the .env file' });
  }
  try {
    const url = buildAuthUrl();
    res.json({ url });
  } catch (err) {
    console.error('gmailAuthUrl error:', err);
    res.status(500).json({ error: 'Failed to build auth URL' });
  }
};

export const gmailCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }
  try {
    const tokens = await exchangeCodeForTokens(code);
    const profile = await getGmailProfile(tokens.access_token);

    await query(
      `INSERT INTO gmail_accounts (email, access_token, refresh_token, token_expires_at)
       VALUES ($1, $2, $3, now() + ($4 * interval '1 millisecond'))
       ON CONFLICT (id) DO NOTHING`,
      [profile.emailAddress, tokens.access_token, tokens.refresh_token || null, (tokens.expires_in || 3600) * 1000]
    );

    const html = `
      <html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f0ea">
      <div style="text-align:center;padding:32px;background:white;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.1)">
        <div style="font-size:40px">✅</div>
        <h2 style="margin:8px 0;color:#3C2A21">Gmail Connected!</h2>
        <p style="color:#693F27">${profile.emailAddress}</p>
        <p style="color:#999;font-size:13px">You can close this window and return to the system.</p>
      </div></body></html>
    `;
    res.send(html);
  } catch (err) {
    console.error('gmailCallback error:', err);
    res.status(500).send('<h3>Gmail connection failed. Check server logs.</h3>');
  }
};

export const gmailPoll = async (req, res) => {
  try {
    const { account, messages } = await listSupplierMessages();
    const saved = await saveSupplierMessages(messages);
    res.json({
      account,
      scanned: messages.length,
      matched: messages.length,
      newlySaved: saved.length,
      messages,
    });
  } catch (err) {
    console.error('gmailPoll error:', err);
    res.status(500).json({ error: 'Failed to poll Gmail: ' + err.message });
  }
};

export const gmailMessages = async (req, res) => {
  try {
    const messages = await getSavedMessages();
    res.json(messages);
  } catch (err) {
    console.error('gmailMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch supplier messages' });
  }
};

export const gmailSend = async (req, res) => {
  const { to, subject, body, messageId, poCode, replyToId } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }
  try {
    const result = await sendEmail({ to, subject, body, messageId });
    let saved = null;
    if (poCode) {
      saved = await saveSentMessage({
        gmailMessageId: result.id,
        fromEmail: to,
        subject,
        body,
        poCode,
        inReplyTo: replyToId || messageId,
      });
    }
    res.json({ success: true, messageId: result.id, saved });
  } catch (err) {
    console.error('gmailSend error:', err);
    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
};

export const gmailDisconnect = async (req, res) => {
  try {
    await disconnectGmail();
    res.json({ success: true });
  } catch (err) {
    console.error('gmailDisconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
};
