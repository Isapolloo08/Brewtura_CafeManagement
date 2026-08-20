import bcrypt from 'bcryptjs';
import { query, getClient } from '../db/index.js';

export const getUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.branch_id, b.name as branch_name, u.employee_id, u.name, u.email, u.avatar, u.role, u.is_active, u.created_at
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       ORDER BY u.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req, res) => {
  const { branch_id, employee_id, name, email, password, pin, role, avatar } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }

  try {
    let passwordHash = null;
    let pinHash = null;

    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }
    if (pin) {
      pinHash = await bcrypt.hash(pin, 10);
    }

    const result = await query(
      `INSERT INTO users (branch_id, employee_id, name, email, password_hash, pin_hash, role, avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, branch_id, employee_id, name, email, role, avatar, is_active, created_at`,
      [branch_id || null, employee_id || null, name, email || null, passwordHash, pinHash, role, avatar || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createUser error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email or Employee ID already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT u.id, u.branch_id, b.name as branch_name, u.employee_id, u.name, u.email, u.avatar, u.role, u.is_active, u.created_at
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('getUserById error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { branch_id, employee_id, name, email, password, pin, role, is_active, avatar } = req.body;

  try {
    let updates = [];
    let params = [];
    let idx = 1;

    if (branch_id !== undefined) { updates.push(`branch_id = $${idx++}`); params.push(branch_id); }
    if (employee_id !== undefined) { updates.push(`employee_id = $${idx++}`); params.push(employee_id); }
    if (name) { updates.push(`name = $${idx++}`); params.push(name); }
    if (email !== undefined) { updates.push(`email = $${idx++}`); params.push(email); }
    if (role) { updates.push(`role = $${idx++}`); params.push(role); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }
    if (avatar !== undefined) { updates.push(`avatar = $${idx++}`); params.push(avatar); }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      params.push(passwordHash);
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

    params.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, branch_id, employee_id, name, email, avatar, role, is_active, updated_at`;

    const result = await query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  try {
    // Remove FK references to the user so the DELETE succeeds even when the
    // user has shifts, orders, stock movements, or other history records.
    try {
      await client.query('BEGIN');
      await client.query('UPDATE orders SET placed_by_user_id = NULL WHERE placed_by_user_id = $1', [id]);
      await client.query('UPDATE order_items SET prepared_by = NULL WHERE prepared_by = $1', [id]);
      await client.query('UPDATE order_status_history SET changed_by = NULL WHERE changed_by = $1', [id]);
      await client.query('UPDATE payments SET received_by = NULL WHERE received_by = $1', [id]);
      await client.query('UPDATE order_discounts SET approved_by = NULL WHERE approved_by = $1', [id]);
      await client.query('UPDATE order_item_discounts SET approved_by = NULL WHERE approved_by = $1', [id]);
      await client.query('UPDATE stock_movements SET created_by = NULL WHERE created_by = $1', [id]);
      await client.query('UPDATE purchase_orders SET created_by = NULL WHERE created_by = $1', [id]);
      await client.query('UPDATE shifts SET user_id = NULL WHERE user_id = $1', [id]);
      await client.query('UPDATE shift_reports SET user_id = NULL WHERE user_id = $1', [id]);

      const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      await client.query('COMMIT');
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
