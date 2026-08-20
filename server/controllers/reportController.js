import { query, getClient } from '../db/index.js';
import { invalidateSemaphoreConfig } from '../services/semaphoreService.js';

// camelCase → snake_case map used by the React UI.
// All DB reads/writes use the snake_case (canonical) key so each setting
// exists exactly once in the table.
const KEY_CANONICAL = {
  storeName:      'store_name',
  logo:           'logo',
  logoShape:      'logo_shape',
  logoScale:      'logo_scale',
  taxId:          'tax_id',
  vatRate:        'tax_rate',
  serviceCharge:  'service_charge',
  taxInclusive:   'tax_inclusive',
  receiptHeader:  'receipt_header',
  receiptFooter:  'receipt_footer',
  qrCodeEnabled:  'qr_code_enabled',
  receiptShowLogo: 'receipt_show_logo',
  receiptPrinter: 'receipt_printer',
  kitchenPrinter: 'kitchen_printer',
  openingCash:    'opening_cash',
  semaphoreApiKey: 'semaphore_api_key',
  semaphoreSenderName: 'semaphore_sender_name',
};

// Reverse map: snake_case DB key → camelCase UI key (many-to-one where alias == canonical)
const CANONICAL_TO_CAMEL = {};
for (const [camel, snake] of Object.entries(KEY_CANONICAL)) {
  CANONICAL_TO_CAMEL[snake] = camel;
}

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

export const getBestSellers = async (req, res) => {
  const { date, limit } = req.query;
  const max = Math.min(parseInt(limit, 10) || 10, 25);

  const dayStart = date ? new Date(date) : new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  try {
    const result = await query(
      `SELECT p.id, p.name, cat.name AS category_name,
              SUM(oi.quantity)::int AS total_sold,
              ROUND(SUM(oi.quantity * oi.unit_price)::numeric, 2) AS total_revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN categories cat ON p.category_id = cat.id
       WHERE o.status IN ('confirmed','preparing','ready','completed')
         AND o.created_at >= $1 AND o.created_at < $2
       GROUP BY p.id, p.name, cat.name
       ORDER BY total_sold DESC, total_revenue DESC
       LIMIT $3`,
      [dayStart.toISOString(), dayEnd.toISOString(), max]
    );

    res.json({
      date: dayStart.toISOString(),
      best_sellers: result.rows.map((r, i) => ({
        rank: i + 1,
        product_id: r.id,
        name: r.name,
        category: r.category_name || 'Item',
        total_sold: parseInt(r.total_sold, 10) || 0,
        total_revenue: parseFloat(r.total_revenue) || 0,
      })),
    });
  } catch (err) {
    console.error('getBestSellers error:', err);
    res.status(500).json({ error: 'Failed to fetch best sellers' });
  }
};

export const getSalesByHour = async (req, res) => {
  const { date } = req.query;
  const dayStart = date ? new Date(date) : new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  try {
    const result = await query(
      `SELECT EXTRACT(HOUR FROM created_at)::int AS hour,
              COALESCE(SUM(total), 0)::numeric AS total_sales,
              COUNT(id)::int AS order_count
       FROM orders
       WHERE status IN ('confirmed','preparing','ready','completed')
         AND created_at >= $1 AND created_at < $2
       GROUP BY hour
       ORDER BY hour`,
      [dayStart.toISOString(), dayEnd.toISOString()]
    );

    // Zero-fill all 24 hours so the client can look up any bucket directly.
    const byHour = {};
    for (const row of result.rows) byHour[row.hour] = row;
    const salesByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      total_sales: parseFloat(byHour[h]?.total_sales || 0),
      order_count: parseInt(byHour[h]?.order_count, 10) || 0,
    }));

    res.json({
      date: dayStart.toISOString(),
      sales_by_hour: salesByHour,
    });
  } catch (err) {
    console.error('getSalesByHour error:', err);
    res.status(500).json({ error: 'Failed to fetch sales by hour' });
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

    // 1. Collect all rows keyed by their canonical (snake_case) name.
    //    If both a legacy camelCase row AND a snake_case row exist for the
    //    same setting, the non-empty value wins.
    const byCanonical = {};
    for (const row of result.rows) {
      // Resolve any legacy camelCase key → snake_case canonical key.
      const canonical = KEY_CANONICAL[row.key] ?? row.key;
      const value = row.value ?? '';
      const existing = byCanonical[canonical];
      if (existing === undefined || (existing === '' && value !== '')) {
        byCanonical[canonical] = value;
      }
    }

    // 2. Build the response object with BOTH the snake_case DB key and
    //    the camelCase alias so the React UI can read either form.
    const out = { ...byCanonical };
    for (const [camel, snake] of Object.entries(KEY_CANONICAL)) {
      if (byCanonical[snake] !== undefined) {
        out[camel] = byCanonical[snake];
      }
    }

    res.json(out);
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req, res) => {
  const settingsObj = req.body;
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Resolve all incoming keys to their canonical snake_case form.
    // Two-pass approach: first collect snake_case keys, then let camelCase
    // aliases overwrite them.  This is necessary because getSettings returns
    // BOTH forms (store_name + storeName), so the save payload contains both.
    // The camelCase key is always the one the user edited in the form, so it
    // must win over the stale snake_case value that came from ...settings.
    const canonicalWrites = {};

    // Pass 1 — snake_case / unknown keys (baseline values)
    for (const [key, value] of Object.entries(settingsObj)) {
      if (KEY_CANONICAL[key]) continue; // skip camelCase aliases for now
      const canonical = key; // already canonical
      canonicalWrites[canonical] = value;
    }

    // Pass 2 — camelCase alias keys always overwrite (these are the user edits)
    for (const [key, value] of Object.entries(settingsObj)) {
      if (!KEY_CANONICAL[key]) continue; // skip non-alias keys
      const canonical = KEY_CANONICAL[key];
      // Only overwrite with empty string if there's no non-empty alternative
      const existing = canonicalWrites[canonical];
      if (existing === undefined || String(value) !== '' || String(existing) === '') {
        canonicalWrites[canonical] = value;
      }
    }

    // Upsert every canonical key into the settings table.
    for (const [key, value] of Object.entries(canonicalWrites)) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(value ?? '')]
      );
    }

    // Clean up any stale legacy camelCase alias rows (e.g. 'storeName') that
    // may have been written by an older version of the UI.  Only delete rows
    // whose camelCase alias differs from the canonical key (so we never touch
    // 'logo' which is both alias and canonical).
    const staleAliases = Object.keys(KEY_CANONICAL).filter(
      (camel) => KEY_CANONICAL[camel] !== camel
    );
    for (const alias of staleAliases) {
      await client.query('DELETE FROM settings WHERE key = $1', [alias]);
    }

    // Drop the SMS provider caches when the Semaphore credentials changed so a
    // freshly saved key/balance shows up immediately.
    if ('semaphore_api_key' in canonicalWrites || 'semaphore_sender_name' in canonicalWrites) {
      invalidateSemaphoreConfig();
    }

    await client.query('COMMIT');
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateSettings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
};
