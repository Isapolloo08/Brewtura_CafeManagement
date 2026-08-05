import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

export const login = async (req, res) => {
  const { email, password, employeeId } = req.body;

  if ((!email && !employeeId) || !password) {
    return res.status(400).json({ error: 'Employee ID (or email) and password are required' });
  }

  try {
    const result = await query(
      `SELECT id, branch_id, name, email, employee_id, password_hash, role, is_active
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
    let sql = 'SELECT id, branch_id, name, email, pin_hash, role, is_active FROM users WHERE pin_hash IS NOT NULL';
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
      'SELECT id, branch_id, name, email, role, is_active, created_at FROM users WHERE id = $1',
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
