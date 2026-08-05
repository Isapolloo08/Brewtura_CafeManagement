import { query, getClient } from '../db/index.js';

export const recordPayment = async (req, res) => {
  const { order_id, method, amount, reference_no } = req.body;
  const received_by = req.user ? req.user.id : null;

  if (!order_id || !method || !amount) {
    return res.status(400).json({ error: 'order_id, method, and amount are required' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const paymentRes = await client.query(
      `INSERT INTO payments (order_id, method, amount, reference_no, received_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [order_id, method, amount, reference_no || null, received_by]
    );

    // Calculate total payments made for this order
    const totalPaidRes = await client.query(
      'SELECT SUM(amount) as total_paid FROM payments WHERE order_id = $1',
      [order_id]
    );

    const orderRes = await client.query('SELECT total FROM orders WHERE id = $1', [order_id]);
    if (orderRes.rows.length === 0) {
      throw new Error('Order not found');
    }

    const orderTotal = parseFloat(orderRes.rows[0].total);
    const totalPaid = parseFloat(totalPaidRes.rows[0].total_paid || 0);

    let newPaymentStatus = 'unpaid';
    if (totalPaid >= orderTotal) {
      newPaymentStatus = 'paid';
    }

    await client.query(
      "UPDATE orders SET payment_status = $1, status = 'confirmed', updated_at = now() WHERE id = $2",
      [newPaymentStatus, order_id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Payment recorded',
      payment: paymentRes.rows[0],
      payment_status: newPaymentStatus
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('recordPayment error:', err);
    res.status(500).json({ error: err.message || 'Failed to record payment' });
  } finally {
    client.release();
  }
};

export const getDiscounts = async (req, res) => {
  try {
    const result = await query('SELECT * FROM discounts_promos WHERE is_active = true ORDER BY code ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('getDiscounts error:', err);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
};

export const createDiscount = async (req, res) => {
  const { code, description, type, value, valid_from, valid_to } = req.body;
  try {
    const result = await query(
      `INSERT INTO discounts_promos (code, description, type, value, valid_from, valid_to)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [code, description || null, type, value, valid_from || null, valid_to || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createDiscount error:', err);
    res.status(500).json({ error: 'Failed to create discount promo' });
  }
};
