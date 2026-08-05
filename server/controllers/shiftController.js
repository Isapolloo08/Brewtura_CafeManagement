import { query, getClient } from '../db/index.js';

export const openShift = async (req, res) => {
  const { cash_drawer_start, branch_id } = req.body;
  const user_id = req.user.id;

  try {
    // Check if user already has an active shift
    const existing = await query(
      'SELECT id FROM shifts WHERE user_id = $1 AND closed_at IS NULL',
      [user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You already have an active open shift', shiftId: existing.rows[0].id });
    }

    const result = await query(
      `INSERT INTO shifts (user_id, branch_id, cash_drawer_start)
       VALUES ($1, $2, $3) RETURNING *`,
      [user_id, branch_id || req.user.branch_id, cash_drawer_start || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('openShift error:', err);
    res.status(500).json({ error: 'Failed to open shift' });
  }
};

export const closeShift = async (req, res) => {
  const { shift_id, cash_drawer_end } = req.body;

  try {
    const result = await query(
      `UPDATE shifts
       SET cash_drawer_end = $1, closed_at = now()
       WHERE id = $2 AND closed_at IS NULL
       RETURNING *`,
      [cash_drawer_end, shift_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active shift not found or already closed' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('closeShift error:', err);
    res.status(500).json({ error: 'Failed to close shift' });
  }
};

export const recordCashMovement = async (req, res) => {
  const { shift_id, type, amount, reason } = req.body;

  if (!shift_id || !type || !amount) {
    return res.status(400).json({ error: 'shift_id, type (cash_in/cash_out), and amount are required' });
  }

  try {
    const result = await query(
      `INSERT INTO cash_movements (shift_id, type, amount, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [shift_id, type, amount, reason || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('recordCashMovement error:', err);
    res.status(500).json({ error: 'Failed to record cash movement' });
  }
};

export const getCurrentShift = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM shifts WHERE user_id = $1 AND closed_at IS NULL ORDER BY opened_at DESC LIMIT 1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ active: false, shift: null });
    }
    res.json({ active: true, shift: result.rows[0] });
  } catch (err) {
    console.error('getCurrentShift error:', err);
    res.status(500).json({ error: 'Failed to fetch shift status' });
  }
};

export const getShifts = async (req, res) => {
  try {
    const result = await query(
      `SELECT
         s.id,
         s.user_id,
         s.branch_id,
         b.name AS branch_name,
         u.name AS cashier,
         s.cash_drawer_start AS opening_cash,
         s.cash_drawer_end AS actual_cash,
         s.opened_at,
         s.closed_at,
         COALESCE(p.cash_sales, 0) AS cash_sales,
         (s.cash_drawer_start + COALESCE(p.cash_sales, 0)) AS expected_cash
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN branches b ON b.id = s.branch_id
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(amount), 0) AS cash_sales
         FROM payments
         WHERE method = 'cash'
           AND paid_at >= s.opened_at
           AND paid_at <= COALESCE(s.closed_at, now())
       ) p ON true
       ORDER BY s.opened_at DESC`
    );

    const shifts = result.rows.map((s) => {
      const opening = parseFloat(s.opening_cash) || 0;
      const expected = parseFloat(s.expected_cash) || 0;
      const actual = s.actual_cash === null ? null : parseFloat(s.actual_cash);
      const difference = actual === null ? null : actual - expected;
      const status = s.closed_at
        ? (difference === null || Math.abs(difference) < 0.005 ? 'Matched' : 'Mismatched')
        : 'Open';
      return {
        id: s.id,
        user_id: s.user_id,
        branch_id: s.branch_id,
        branch_name: s.branch_name || 'Unassigned',
        cashier: s.cashier,
        opening_cash: opening,
        actual_cash: actual,
        cash_sales: parseFloat(s.cash_sales) || 0,
        expected_cash: expected,
        difference,
        status,
        opened_at: s.opened_at,
        closed_at: s.closed_at,
      };
    });

    res.json(shifts);
  } catch (err) {
    console.error('getShifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shift logs' });
  }
};

export const getBranches = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, address, is_active FROM branches ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getBranches error:', err);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};
