import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { sendEmail } from '../services/gmailService.js';

// Ensure password reset columns exist (safe to run on every boot).
const ensurePasswordResetColumns = async () => {
  try {
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ');
  } catch (err) {
    console.error('Failed to ensure password reset columns:', err);
  }
};
ensurePasswordResetColumns();

export const login = async (req, res) => {
  const { email, password, employeeId } = req.body;

  if ((!email && !employeeId) || !password) {
    return res.status(400).json({ error: 'Employee ID (or email) and password are required' });
  }

  try {
    const result = await query(
      `SELECT id, branch_id, name, email, employee_id, avatar, password_hash, role, is_active
       FROM users
       WHERE employee_id = $1 OR email = $2`,
      [employeeId || null, email || null]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Employee ID or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Password authentication not configured for user' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid Employee ID or password' });
    }

    const token = jwt.sign(
      { id: user.id, branch_id: user.branch_id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        branch_id: user.branch_id,
        name: user.name,
        email: user.email,
        employee_id: user.employee_id,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const pinLogin = async (req, res) => {
  const { pin, userId } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  try {
    let sql = 'SELECT id, branch_id, name, email, avatar, pin_hash, role, is_active FROM users WHERE pin_hash IS NOT NULL';
    let params = [];

    if (userId) {
      sql += ' AND id = $1';
      params.push(userId);
    }

    const result = await query(sql, params);

    let matchedUser = null;
    for (const u of result.rows) {
      if (u.is_active && await bcrypt.compare(pin, u.pin_hash)) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: 'Invalid PIN or user inactive' });
    }

    const token = jwt.sign(
      { id: matchedUser.id, branch_id: matchedUser.branch_id, role: matchedUser.role, name: matchedUser.name },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'PIN Authentication successful',
      token,
      user: {
        id: matchedUser.id,
        branch_id: matchedUser.branch_id,
        name: matchedUser.name,
        email: matchedUser.email,
        avatar: matchedUser.avatar,
        role: matchedUser.role
      }
    });
  } catch (err) {
    console.error('PIN Login error:', err);
    res.status(500).json({ error: 'Server error during PIN login' });
  }
};

export const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.branch_id, b.name AS branch_name, u.employee_id,
              u.name, u.email, u.avatar, u.role, u.is_active, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateMe = async (req, res) => {
  const { name, email, avatar, password, currentPassword, pin } = req.body;

  try {
    // Verify current password if user is trying to change password
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const userRow = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (!userRow.rows[0]?.password_hash) {
        return res.status(400).json({ error: 'No password set on this account' });
      }
      const match = await bcrypt.compare(currentPassword, userRow.rows[0].password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    let updates = [];
    let params = [];
    let idx = 1;

    if (name)              { updates.push(`name = $${idx++}`);   params.push(name); }
    if (email !== undefined){ updates.push(`email = $${idx++}`);  params.push(email || null); }
    if (avatar !== undefined){ updates.push(`avatar = $${idx++}`); params.push(avatar || null); }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      params.push(hash);
    }
    if (pin) {
      const pinHash = await bcrypt.hash(pin, 10);
      updates.push(`pin_hash = $${idx++}`);
      params.push(pinHash);
    }

    updates.push(`updated_at = now()`);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.user.id);
    const sql = `
      UPDATE users SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING id, branch_id, employee_id, name, email, avatar, role, is_active, updated_at
    `;

    const result = await query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateMe error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already in use by another account' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email, employeeId } = req.body;
  const identifier = (email || employeeId || '').trim();

  if (!identifier) {
    return res.status(400).json({ error: 'Email or Employee ID is required' });
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const tokenHash = crypto.createHash('sha256').update(code).digest('hex');

  try {
    const result = await query(
      `SELECT id, name, email FROM users
       WHERE (email = $1 OR employee_id = $1) AND is_active = true`,
      [identifier]
    );

    const user = result.rows[0];
    if (!user || !user.email) {
      return res.json({ message: 'If an account exists for that identifier, a reset code has been sent.' });
    }

    await query(
      `UPDATE users
       SET password_reset_token_hash = $1, password_reset_expires_at = now() + interval '30 minutes'
       WHERE id = $2`,
      [tokenHash, user.id]
    );

    await sendEmail({
      to: user.email,
      subject: 'Brewtura — Password Reset Code',
      body: `Hi ${user.name},\n\nYou requested a password reset for your Brewtura account.\n\nYour 6-digit reset code is: ${code}\n\nThis code expires in 30 minutes. If you did not request this, you can safely ignore this email.\n\n— Brewtura Admin System`,
    });

    res.json({ message: 'A password reset code has been sent to your email.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    if (String(err.message).includes('No Gmail account connected')) {
      return res.status(503).json({ error: 'Password reset emails are unavailable. Contact your administrator to reset your password.' });
    }
    res.status(500).json({ error: 'Failed to send password reset code' });
  }
};

export const resetPassword = async (req, res) => {
  const { code, password } = req.body;

  if (!code || !password) {
    return res.status(400).json({ error: 'Reset code and new password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const tokenHash = crypto.createHash('sha256').update(String(code).trim()).digest('hex');

  try {
    const result = await query(
      `SELECT id FROM users
       WHERE password_reset_token_hash = $1 AND password_reset_expires_at > now() AND is_active = true`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users
       SET password_hash = $1, password_reset_token_hash = NULL, password_reset_expires_at = NULL, updated_at = now()
       WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    );

    res.json({ message: 'Password has been reset. You can now sign in with your new password.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
