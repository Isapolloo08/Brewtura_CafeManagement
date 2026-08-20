import { query, getClient } from '../db/index.js';

// Helper to generate readable human friendly order number (e.g., "A-101")
const generateOrderNumber = async (client) => {
  const prefix = 'A';
  const todayCountRes = await client.query(
    "SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE"
  );
  const count = parseInt(todayCountRes.rows[0].count, 10) + 1;
  const pad = String(count).padStart(3, '0');
  return `${prefix}-${pad}`;
};

export const createOrder = async (req, res) => {
  const {
    branch_id, order_type, table_number, customer_phone, customer_name,
    items, notes, payment_method
  } = req.body;

  const placed_by_user_id = req.user ? req.user.id : null;

  if (!order_type || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order type and at least one item are required' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Customer registration or lookup
    let customer_id = null;
    if (customer_phone) {
      const custRes = await client.query(
        'SELECT id FROM customers WHERE phone_number = $1',
        [customer_phone]
      );
      if (custRes.rows.length > 0) {
        customer_id = custRes.rows[0].id;
      } else {
        const newCust = await client.query(
          'INSERT INTO customers (phone_number, name) VALUES ($1, $2) RETURNING id',
          [customer_phone, customer_name || 'Customer']
        );
        customer_id = newCust.rows[0].id;
      }
    }

    // 2. Generate Order Number & Calculations
    const order_number = await generateOrderNumber(client);

    let subtotal = 0;
    const validatedItems = [];

    for (let item of items) {
      const prodRes = await client.query('SELECT base_price FROM products WHERE id = $1', [item.product_id]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      let unitPrice = parseFloat(prodRes.rows[0].base_price);

      if (item.customization_id) {
        const custRes = await client.query('SELECT price_delta FROM product_customizations WHERE id = $1', [item.customization_id]);
        if (custRes.rows.length > 0) {
          unitPrice += parseFloat(custRes.rows[0].price_delta);
        }
      }

      let lineTotal = unitPrice * item.quantity;
      let addonDetails = [];

      if (item.addons && Array.isArray(item.addons)) {
        for (let addonId of item.addons) {
          const addonRes = await client.query(
            `SELECT default_price_delta AS price FROM customization_templates
             WHERE id = $1 AND customization_type = 'addon'`,
            [addonId]
          );
          if (addonRes.rows.length > 0) {
            const addonPrice = parseFloat(addonRes.rows[0].price);
            lineTotal += addonPrice * item.quantity;
            addonDetails.push({ addon_id: addonId, unit_price: addonPrice });
          }
        }
      }

      subtotal += lineTotal;
      validatedItems.push({
        ...item,
        unit_price: unitPrice,
        addonDetails
      });
    }

    // 2b. Read tax & service charge configuration from global settings
    const settingsRes = await client.query(
      `SELECT key, value FROM settings
       WHERE key IN ('tax_rate', 'service_charge', 'tax_inclusive')`
    );
    const settingsMap = {};
    for (const row of settingsRes.rows) settingsMap[row.key] = row.value;

    const taxRate = parseFloat(settingsMap.tax_rate) || 0;
    const serviceCharge = parseFloat(settingsMap.service_charge) || 0;
    const taxInclusive = ['true', '1', 'yes'].includes(
      String(settingsMap.tax_inclusive).toLowerCase()
    );

    let service_charge_total = 0;
    let tax_total = 0;
    let total = subtotal;

    // Service charge is a percentage of the subtotal, added on top.
    if (serviceCharge > 0) {
      service_charge_total = Math.round(subtotal * serviceCharge * 100) / 100;
      total += service_charge_total;
    }

    // VAT — if prices are tax-inclusive the VAT is already inside the menu
    // price (only the embedded portion is reported); otherwise it is added
    // on top at checkout.
    if (taxRate > 0) {
      if (taxInclusive) {
        tax_total = Math.round(subtotal * (taxRate / (1 + taxRate)) * 100) / 100;
      } else {
        tax_total = Math.round(subtotal * taxRate * 100) / 100;
        total += tax_total;
      }
    }

    // 3. Create Order Record
    const orderRes = await client.query(
      `INSERT INTO orders
        (branch_id, order_number, order_type, table_number, customer_id, placed_by_user_id, status, subtotal, service_charge_total, tax_total, total, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        branch_id || (req.user ? req.user.branch_id : 1),
        order_number,
        order_type,
        table_number || null,
        customer_id,
        placed_by_user_id,
        payment_method ? 'confirmed' : 'pending_payment',
        subtotal,
        service_charge_total,
        tax_total,
        total,
        notes || null
      ]
    );

    const order = orderRes.rows[0];

    // 4. Create Order Items & Addons, and Deduct Ingredients/Stock
    for (let item of validatedItems) {
      const itemRes = await client.query(
        `INSERT INTO order_items (order_id, product_id, customization_id, quantity, unit_price, line_notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [order.id, item.product_id, item.customization_id || null, item.quantity, item.unit_price, item.line_notes || null]
      );

      const order_item_id = itemRes.rows[0].id;

      for (let addon of item.addonDetails) {
        await client.query(
          'INSERT INTO order_item_addons (order_item_id, addon_id, unit_price) VALUES ($1, $2, $3)',
          [order_item_id, addon.addon_id, addon.unit_price]
        );

        // Deduct addon recipe ingredients
        const addonRecipes = await client.query(
          'SELECT ingredient_id, qty_required FROM addon_recipes WHERE addon_id = $1',
          [addon.addon_id]
        );

        for (let ar of addonRecipes.rows) {
          const requiredQty = parseFloat(ar.qty_required) * item.quantity;
          await client.query(
            'UPDATE ingredients SET current_stock = current_stock - $1, updated_at = now() WHERE id = $2',
            [requiredQty, ar.ingredient_id]
          );
          await client.query(
            `INSERT INTO stock_movements (ingredient_id, type, quantity, reference_order_id, note, created_by)
             VALUES ($1, 'stock_out', $2, $3, $4, $5)`,
            [ar.ingredient_id, requiredQty, order.id, `Order ${order.order_number} Addon`, placed_by_user_id]
          );
        }
      }

      // Deduct product/customization recipe ingredients
      let recipeQuery = item.customization_id
        ? 'SELECT ingredient_id, qty_required FROM recipes WHERE product_customization_id = $1'
        : 'SELECT ingredient_id, qty_required FROM recipes WHERE product_id = $1 AND product_customization_id IS NULL';

      let recipeParam = item.customization_id ? item.customization_id : item.product_id;
      const recipes = await client.query(recipeQuery, [recipeParam]);

      for (let r of recipes.rows) {
        const requiredQty = parseFloat(r.qty_required) * item.quantity;
        await client.query(
          'UPDATE ingredients SET current_stock = current_stock - $1, updated_at = now() WHERE id = $2',
          [requiredQty, r.ingredient_id]
        );
        await client.query(
          `INSERT INTO stock_movements (ingredient_id, type, quantity, reference_order_id, note, created_by)
           VALUES ($1, 'stock_out', $2, $3, $4, $5)`,
          [r.ingredient_id, requiredQty, order.id, `Order ${order.order_number}`, placed_by_user_id]
        );
      }
    }

    // 5. Audit trail history
    await client.query(
      'INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, $2, $3)',
      [order.id, order.status, placed_by_user_id]
    );

    // 6. Record immediate payment if provided
    if (payment_method) {
      await client.query(
        `INSERT INTO payments (order_id, method, amount, received_by)
         VALUES ($1, $2, $3, $4)`,
        [order.id, payment_method, total, placed_by_user_id]
      );
      await client.query(
        "UPDATE orders SET payment_status = 'paid', updated_at = now() WHERE id = $1",
        [order.id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createOrder error:', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  } finally {
    client.release();
  }
};

export const getOrders = async (req, res) => {
  const { status, order_type } = req.query;

  try {
    let sql = `
      SELECT o.*, c.name as customer_name, c.phone_number as customer_phone, u.name as placed_by_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.placed_by_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND o.status = $${params.length}`;
    }

    if (order_type) {
      params.push(order_type);
      sql += ` AND o.order_type = $${params.length}`;
    }

    sql += ' ORDER BY o.created_at DESC LIMIT 50';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getOrders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getTransactions = async (req, res) => {
  const {
    branch_id,
    status,
    order_type,
    payment_method,
    start_date,
    end_date,
    search,
    page = 1,
    limit = 50,
  } = req.query;

  try {
    const params = [];
    let conditions = ['1=1'];

    if (branch_id && branch_id !== 'all') {
      params.push(branch_id);
      conditions.push(`o.branch_id = $${params.length}`);
    }
    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }
    if (order_type && order_type !== 'all') {
      params.push(order_type);
      conditions.push(`o.order_type = $${params.length}`);
    }
    if (payment_method && payment_method !== 'all') {
      params.push(payment_method);
      conditions.push(`p.method::text = $${params.length}`);
    }
    if (start_date) {
      params.push(start_date);
      conditions.push(`o.created_at >= $${params.length}`);
    }
    if (end_date) {
      // Include the whole end day
      params.push(end_date + ' 23:59:59');
      conditions.push(`o.created_at <= $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(o.order_number ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.phone_number ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Count total for pagination
    const countSql = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE ${whereClause}
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    // Main query
    params.push(parseInt(limit, 10));
    params.push(offset);
    const sql = `
      SELECT
        o.id, o.order_number, o.order_type, o.table_number,
        o.status, o.payment_status,
        o.subtotal, o.tax_total, o.service_charge_total, o.total, o.discount_total,
        o.notes, o.created_at, o.updated_at,
        b.name AS branch_name,
        c.name AS customer_name, c.phone_number AS customer_phone,
        u.name AS placed_by_name,
        COALESCE(p.method::text, 'unpaid') AS payment_method,
        p.amount AS payment_amount,
        (
          SELECT json_agg(json_build_object(
            'name', pr.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price
          ))
          FROM order_items oi
          JOIN products pr ON oi.product_id = pr.id
          WHERE oi.order_id = o.id
        ) AS items
      FROM orders o
      LEFT JOIN branches b ON o.branch_id = b.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.placed_by_user_id = u.id
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await query(sql, params);

    res.json({
      transactions: result.rows,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    console.error('getTransactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const changed_by = req.user ? req.user.id : null;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    await client.query(
      'INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, $2, $3)',
      [id, status, changed_by]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateOrderStatus error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  } finally {
    client.release();
  }
};

export const getOrderByToken = async (req, res) => {
  const { token } = req.params;
  try {
    const orderRes = await query('SELECT * FROM orders WHERE order_token = $1', [token]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];
    const itemsRes = await query(
      `SELECT oi.*, p.name as product_name, pc.name as customization_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_customizations pc ON oi.customization_id = pc.id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    order.items = itemsRes.rows;
    res.json(order);
  } catch (err) {
    console.error('getOrderByToken error:', err);
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
};
