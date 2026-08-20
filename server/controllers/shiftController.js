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

export const updateShift = async (req, res) => {
  const { id } = req.params;
  const { cash_drawer_start, cash_drawer_end } = req.body;

  if (cash_drawer_start === undefined && cash_drawer_end === undefined) {
    return res.status(400).json({ error: 'Provide cash_drawer_start and/or cash_drawer_end to update' });
  }

  try {
    const result = await query(
      `UPDATE shifts
       SET cash_drawer_start = COALESCE($1, cash_drawer_start),
           cash_drawer_end = COALESCE($2, cash_drawer_end),
           closed_at = CASE WHEN $2::numeric IS NOT NULL AND closed_at IS NULL THEN now() ELSE closed_at END
       WHERE id = $3
       RETURNING *`,
      [
        cash_drawer_start === undefined ? null : cash_drawer_start,
        cash_drawer_end === undefined ? null : cash_drawer_end,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateShift error:', err);
    res.status(500).json({ error: 'Failed to update shift' });
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
         COALESCE(d.digital_sales, 0) AS digital_payments,
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
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(amount), 0) AS digital_sales
         FROM payments
         WHERE method <> 'cash'
           AND paid_at >= s.opened_at
           AND paid_at <= COALESCE(s.closed_at, now())
       ) d ON true
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
        digital_payments: parseFloat(s.digital_payments) || 0,
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
      'SELECT id, name, address, is_active, is_main FROM branches ORDER BY is_main DESC, name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getBranches error:', err);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};

export const getShiftReport = async (req, res) => {
  const { id } = req.params;

  try {
    const shiftRes = await query(
      `SELECT s.id, s.user_id, s.branch_id, s.cash_drawer_start AS opening_cash,
              s.cash_drawer_end AS actual_cash, s.opened_at, s.closed_at,
              u.name AS cashier, b.name AS branch_name
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN branches b ON b.id = s.branch_id
       WHERE s.id = $1`,
      [id]
    );

    if (shiftRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const shift = shiftRes.rows[0];
    const shiftEnd = shift.closed_at || new Date();

    // All orders placed by this cashier during the shift window
    const ordersRes = await query(
      `SELECT o.id, o.order_number, o.order_type, o.table_number, o.status,
              o.payment_status, o.subtotal, o.tax_total, o.total, o.created_at,
              c.name AS customer_name, c.phone_number AS customer_phone
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.placed_by_user_id = $1
         AND o.created_at >= $2
         AND o.created_at <= $3
       ORDER BY o.created_at ASC`,
      [shift.user_id, shift.opened_at, shiftEnd]
    );

    const orders = ordersRes.rows;
    const orderIds = orders.map((o) => o.id);

    // Payments for these orders
    const paymentsRes = await query(
      `SELECT p.order_id, p.method, p.amount, p.reference_no, p.paid_at, u.name AS received_by
       FROM payments p
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.order_id = ANY($1)
       ORDER BY p.paid_at ASC`,
      [orderIds]
    );

    // Line items with product/customization names
    const itemsRes = await query(
      `SELECT oi.order_id, oi.quantity, oi.unit_price, oi.line_notes,
              p.name AS product_name, pc.name AS customization_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_customizations pc ON oi.customization_id = pc.id
       WHERE oi.order_id = ANY($1)
       ORDER BY oi.id ASC`,
      [orderIds]
    );

    // Order status history
    const historyRes = await query(
      `SELECT osh.order_id, osh.status, osh.changed_at, u.name AS changed_by
       FROM order_status_history osh
       LEFT JOIN users u ON osh.changed_by = u.id
       WHERE osh.order_id = ANY($1)
       ORDER BY osh.changed_at ASC`,
      [orderIds]
    );

    const paymentsByOrder = {};
    const itemsByOrder = {};
    const historyByOrder = {};
    for (const p of paymentsRes.rows) (paymentsByOrder[p.order_id] ||= []).push(p);
    for (const it of itemsRes.rows) (itemsByOrder[it.order_id] ||= []).push(it);
    for (const h of historyRes.rows) (historyByOrder[h.order_id] ||= []).push(h);

    for (const o of orders) {
      o.items = itemsByOrder[o.id] || [];
      o.payments = paymentsByOrder[o.id] || [];
      o.history = historyByOrder[o.id] || [];
    }

    const cashSales = paymentsRes.rows
      .filter((p) => p.method === 'cash')
      .reduce((s, p) => s + parseFloat(p.amount), 0);
    const digitalSales = paymentsRes.rows
      .filter((p) => p.method !== 'cash')
      .reduce((s, p) => s + parseFloat(p.amount), 0);
    const totalSales = orders.reduce((s, o) => s + parseFloat(o.total), 0);
    const actualCash = shift.actual_cash === null ? null : parseFloat(shift.actual_cash);
    const expectedCash = parseFloat(shift.opening_cash) + cashSales;
    const variance = actualCash === null ? null : actualCash - expectedCash;

    // Persist/refresh the shift_reports snapshot
    await query(
      `INSERT INTO shift_reports
         (shift_id, user_id, user_name, branch_id, branch_name, opened_at, closed_at,
          cash_drawer_start, cash_drawer_end, transaction_count, total_sales,
          cash_sales, digital_sales, variance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (shift_id) DO UPDATE SET
          user_name = EXCLUDED.user_name,
          branch_name = EXCLUDED.branch_name,
          closed_at = EXCLUDED.closed_at,
          cash_drawer_start = EXCLUDED.cash_drawer_start,
          cash_drawer_end = EXCLUDED.cash_drawer_end,
          transaction_count = EXCLUDED.transaction_count,
          total_sales = EXCLUDED.total_sales,
          cash_sales = EXCLUDED.cash_sales,
          digital_sales = EXCLUDED.digital_sales,
          variance = EXCLUDED.variance`,
      [
        shift.id,
        shift.user_id,
        shift.cashier,
        shift.branch_id,
        shift.branch_name || 'Unassigned',
        shift.opened_at,
        shift.closed_at || shiftEnd,
        parseFloat(shift.opening_cash) || 0,
        actualCash === null ? 0 : actualCash,
        orders.length,
        totalSales,
        cashSales,
        digitalSales,
        variance === null ? 0 : variance,
      ]
    );

    res.json({
      shift,
      summary: {
        transaction_count: orders.length,
        total_sales: totalSales,
        cash_sales: cashSales,
        digital_sales: digitalSales,
        expected_cash: expectedCash,
        variance,
      },
      orders,
    });
  } catch (err) {
    console.error('getShiftReport error:', err);
    res.status(500).json({ error: 'Failed to fetch shift report' });
  }
};
