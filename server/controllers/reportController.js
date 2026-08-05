import { query } from '../db/index.js';

export const getDashboardStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const [todayRes, weeklyRes, monthlyRes, paymentRes, topItemsRes] = await Promise.all([
      // Today's stats
      query(
        `SELECT COUNT(id) as total_orders, COALESCE(SUM(total),0) as total_sales
         FROM orders
         WHERE status IN ('confirmed','preparing','ready','completed')
           AND created_at >= $1`,
        [todayStart.toISOString()]
      ),
      // Weekly
      query(
        `SELECT COALESCE(SUM(total),0) as total_sales
         FROM orders
         WHERE status IN ('confirmed','preparing','ready','completed')
           AND created_at >= $1`,
        [weekStart.toISOString()]
      ),
      // Monthly
      query(
        `SELECT COALESCE(SUM(total),0) as total_sales
         FROM orders
         WHERE status IN ('confirmed','preparing','ready','completed')
           AND created_at >= $1`,
        [monthStart.toISOString()]
      ),
      // Payment method breakdown (all time)
      query(
        `SELECT method, COALESCE(SUM(amount),0) as total_amount, COUNT(id) as count
         FROM payments
         GROUP BY method`
      ),
      // Top selling products (today)
      query(
        `SELECT p.name AS product_name, p.category_id,
                SUM(oi.quantity) AS total_sold,
                SUM(oi.quantity * oi.unit_price) AS total_revenue,
                cat.name AS category_name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         LEFT JOIN categories cat ON p.category_id = cat.id
         WHERE o.status IN ('confirmed','preparing','ready','completed')
           AND o.created_at >= $1
         GROUP BY p.id, p.name, p.category_id, cat.name
         ORDER BY total_sold DESC
         LIMIT 5`,
        [todayStart.toISOString()]
      ),
    ]);

    const today = todayRes.rows[0];
    const totalOrders = parseInt(today.total_orders) || 0;
    const todaySales = parseFloat(today.total_sales) || 0;
    const avgOrderValue = totalOrders > 0 ? todaySales / totalOrders : 0;

    res.json({
      today: {
        total_sales: todaySales,
        total_orders: totalOrders,
        avg_order_value: avgOrderValue,
      },
      weekly_sales: parseFloat(weeklyRes.rows[0].total_sales) || 0,
      monthly_sales: parseFloat(monthlyRes.rows[0].total_sales) || 0,
      payment_methods: paymentRes.rows,
      top_products_today: topItemsRes.rows,
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getSalesReport = async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    let sql = `
      SELECT
        COUNT(id) as total_orders,
        SUM(subtotal) as gross_subtotal,
        SUM(tax_total) as gross_tax,
        SUM(discount_total) as gross_discounts,
        SUM(total) as gross_sales
      FROM orders
      WHERE status IN ('confirmed', 'preparing', 'ready', 'completed')
    `;

    const params = [];

    if (start_date) {
      params.push(start_date);
      sql += ` AND created_at >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      sql += ` AND created_at <= $${params.length}`;
    }

    const summaryRes = await query(sql, params);

    // Sales by Payment Method
    let paymentSql = `
      SELECT method, SUM(amount) as total_amount, COUNT(id) as transaction_count
      FROM payments
      GROUP BY method
    `;
    const paymentRes = await query(paymentSql);

    // Top selling items
    let topItemsSql = `
      SELECT p.name as product_name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.unit_price) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('confirmed', 'preparing', 'ready', 'completed')
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 10
    `;
    const topItemsRes = await query(topItemsSql);

    res.json({
      summary: summaryRes.rows[0],
      paymentMethods: paymentRes.rows,
      topSellingProducts: topItemsRes.rows
    });
  } catch (err) {
    console.error('getSalesReport error:', err);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
};


export const getSettings = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req, res) => {
  const settingsObj = req.body;
  try {
    for (const [key, value] of Object.entries(settingsObj)) {
      await query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(value)]
      );
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
