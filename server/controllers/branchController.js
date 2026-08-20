import { query, getClient } from '../db/index.js';

export const getBranches = async (req, res) => {
  try {
    const result = await query(
      `SELECT b.id, b.name, b.address, b.is_active, b.is_main,
              COUNT(u.id) FILTER (WHERE u.is_active AND u.role <> 'admin')::int AS staff_count,
              (SELECT u2.name FROM users u2
                WHERE u2.branch_id = b.id AND u2.is_active AND u2.role = 'manager'
                ORDER BY u2.id
                LIMIT 1) AS manager_name,
              COALESCE((
                SELECT json_agg(u3.name) FROM users u3
                WHERE u3.branch_id = b.id AND u3.is_active AND u3.role = 'cashier'
              ), '[]') AS cashiers,
              COALESCE((
                SELECT json_agg(u4.name) FROM users u4
                WHERE u4.branch_id = b.id AND u4.is_active AND u4.role = 'stock_clerk'
              ), '[]') AS inventory_staff
       FROM branches b
       LEFT JOIN users u ON u.branch_id = b.id
       GROUP BY b.id
       ORDER BY b.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getBranches error:', err);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};

export const createBranch = async (req, res) => {
  const { name, address, manager_id, cashier_ids, inventory_ids, is_main } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Branch name is required' });
  }

  try {
    const result = await query(
      'INSERT INTO branches (name, address, is_main) VALUES ($1, $2, $3) RETURNING id, name, address, is_active, is_main',
      [String(name).trim(), address || null, !!is_main]
    );
    const branchId = result.rows[0].id;

    // Enforce a single main branch: clear the flag on every other branch
    if (is_main) {
      await query('UPDATE branches SET is_main = false WHERE is_main = true AND id <> $1', [branchId]);
    }

    if (manager_id) {
      await query(
        "UPDATE users SET branch_id = $1 WHERE id = $2 AND role = 'manager'",
        [branchId, manager_id]
      );
    }
    if (Array.isArray(cashier_ids) && cashier_ids.length > 0) {
      await query(
        `UPDATE users SET branch_id = $1 WHERE id = ANY($2::int[]) AND role = 'cashier'`,
        [branchId, cashier_ids]
      );
    }
    if (Array.isArray(inventory_ids) && inventory_ids.length > 0) {
      await query(
        `UPDATE users SET branch_id = $1 WHERE id = ANY($2::int[]) AND role = 'stock_clerk'`,
        [branchId, inventory_ids]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createBranch error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A branch with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create branch' });
  }
};

export const updateBranch = async (req, res) => {
  const { id } = req.params;
  const { name, address, is_active, is_main, manager_id, cashier_ids, inventory_ids } = req.body;

  try {
    let updates = [];
    let params = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(String(name).trim()); }
    if (address !== undefined) { updates.push(`address = $${idx++}`); params.push(address); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }
    if (is_main !== undefined) { updates.push(`is_main = $${idx++}`); params.push(is_main); }

    if (updates.length > 0) {
      params.push(id);
      const sql = `UPDATE branches SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, address, is_active, is_main`;
      const result = await query(sql, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }
    }

    // Enforce a single main branch: clear the flag on every other branch
    if (is_main === true) {
      await query('UPDATE branches SET is_main = false WHERE is_main = true AND id <> $1', [id]);
    }

    if (manager_id !== undefined) {
      await query("UPDATE users SET branch_id = NULL WHERE branch_id = $1 AND role = 'manager'", [id]);
      if (manager_id) {
        await query(
          "UPDATE users SET branch_id = $1 WHERE id = $2 AND role = 'manager'",
          [id, manager_id]
        );
      }
    }

    if (cashier_ids !== undefined) {
      await query("UPDATE users SET branch_id = NULL WHERE branch_id = $1 AND role = 'cashier'", [id]);
      if (Array.isArray(cashier_ids) && cashier_ids.length > 0) {
        await query(
          `UPDATE users SET branch_id = $1 WHERE id = ANY($2::int[]) AND role = 'cashier'`,
          [id, cashier_ids]
        );
      }
    }

    if (inventory_ids !== undefined) {
      await query("UPDATE users SET branch_id = NULL WHERE branch_id = $1 AND role = 'stock_clerk'", [id]);
      if (Array.isArray(inventory_ids) && inventory_ids.length > 0) {
        await query(
          `UPDATE users SET branch_id = $1 WHERE id = ANY($2::int[]) AND role = 'stock_clerk'`,
          [id, inventory_ids]
        );
      }
    }

    const updated = await query(
      'SELECT id, name, address, is_active, is_main FROM branches WHERE id = $1',
      [id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('updateBranch error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A branch with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update branch' });
  }
};

export const deleteBranch = async (req, res) => {
  const { id } = req.params;
  try {
    const users = await query("SELECT COUNT(*)::int AS count FROM users WHERE branch_id = $1 AND role <> 'admin'", [id]);
    if (users.rows[0].count > 0) {
      return res.status(400).json({ error: `Cannot delete branch: ${users.rows[0].count} staff member(s) are assigned to it. Reassign them first.` });
    }
    const result = await query('DELETE FROM branches WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json({ message: 'Branch deleted successfully' });
  } catch (err) {
    if (err.code === '23503') {
      const archived = await query('UPDATE branches SET is_active = false WHERE id = $1 RETURNING id', [id]);
      if (archived.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }
      return res.json({ message: 'Branch has historical records, so it was archived instead of deleted.' });
    }
    console.error('deleteBranch error:', err);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
};

export const hardDeleteBranch = async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  try {
    const exists = await client.query('SELECT id, name FROM branches WHERE id = $1', [id]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    await client.query('BEGIN');
    // Stock movements referencing this branch's orders (no cascade on reference_order_id)
    await client.query(
      `UPDATE stock_movements SET reference_order_id = NULL
       WHERE reference_order_id IN (SELECT id FROM orders WHERE branch_id = $1)`,
      [id]
    );
    // Orders (cascades order_items, order_status_history, payments, order_discounts, order_item_discounts)
    await client.query('DELETE FROM orders WHERE branch_id = $1', [id]);
    // Shifts (cascades cash_movements)
    await client.query('DELETE FROM shifts WHERE branch_id = $1', [id]);
    // Detach dependent records instead of deleting them
    await client.query('UPDATE users SET branch_id = NULL WHERE branch_id = $1', [id]);
    await client.query('UPDATE categories SET branch_id = NULL WHERE branch_id = $1', [id]);
    await client.query('UPDATE ingredients SET branch_id = NULL WHERE branch_id = $1', [id]);
    await client.query('DELETE FROM branches WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ message: `Branch "${exists.rows[0].name}" permanently deleted, including its orders, shifts, and cash movements.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('hardDeleteBranch error:', err);
    res.status(500).json({ error: 'Failed to permanently delete branch' });
  } finally {
    client.release();
  }
};
