import { query, getClient } from '../db/index.js';

// --- INGREDIENTS ---
export const getIngredients = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM ingredients WHERE is_active = true ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getIngredients error:', err);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
};

export const createIngredient = async (req, res) => {
  const { branch_id, name, unit, current_stock, reorder_threshold, unit_cost } = req.body;
  try {
    const result = await query(
      `INSERT INTO ingredients (branch_id, name, unit, current_stock, reorder_threshold, unit_cost)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [branch_id || null, name, unit, current_stock || 0, reorder_threshold || 0, unit_cost || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createIngredient error:', err);
    res.status(500).json({ error: 'Failed to create ingredient' });
  }
};

export const updateIngredient = async (req, res) => {
  const { id } = req.params;
  const { name, unit, current_stock, reorder_threshold, unit_cost, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE ingredients
       SET name = COALESCE($1, name),
           unit = COALESCE($2, unit),
           current_stock = COALESCE($3, current_stock),
           reorder_threshold = COALESCE($4, reorder_threshold),
           unit_cost = COALESCE($5, unit_cost),
           is_active = COALESCE($6, is_active),
           updated_at = now()
       WHERE id = $7 RETURNING *`,
      [name, unit, current_stock, reorder_threshold, unit_cost, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateIngredient error:', err);
    res.status(500).json({ error: 'Failed to update ingredient' });
  }
};

export const deleteIngredient = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE ingredients
       SET is_active = false, updated_at = now()
       WHERE id = $1 AND is_active = true
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json({ message: 'Ingredient deleted', ingredient: result.rows[0] });
  } catch (err) {
    console.error('deleteIngredient error:', err);
    res.status(500).json({ error: 'Failed to delete ingredient' });
  }
};

// --- STOCK MOVEMENTS ---
export const recordStockMovement = async (req, res) => {
  const { ingredient_id, customization_template_id, type, quantity, reference_order_id, note } = req.body;
  const created_by = req.user ? req.user.id : null;

  if ((!ingredient_id && !customization_template_id) || !type || !quantity) {
    return res.status(400).json({ error: 'ingredient_id or customization_template_id, type, and quantity are required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Record stock movement
    const movementRes = await client.query(
      `INSERT INTO stock_movements (ingredient_id, customization_template_id, type, quantity, reference_order_id, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [ingredient_id || null, customization_template_id || null, type, quantity, reference_order_id || null, note || null, created_by]
    );

    // Update stock levels
    let delta = parseFloat(quantity);
    if (type === 'stock_out' || type === 'waste') {
      delta = -delta;
    }

    if (customization_template_id) {
      if (type === 'adjustment') {
        await client.query(
          'UPDATE customization_templates SET stock = $1 WHERE id = $2',
          [Math.round(parseFloat(quantity)), customization_template_id]
        );
      } else {
        await client.query(
          'UPDATE customization_templates SET stock = stock + $1 WHERE id = $2',
          [Math.round(delta), customization_template_id]
        );
      }
    } else if (ingredient_id) {
      if (type === 'adjustment') {
        await client.query(
          'UPDATE ingredients SET current_stock = $1, updated_at = now() WHERE id = $2',
          [quantity, ingredient_id]
        );
      } else {
        await client.query(
          'UPDATE ingredients SET current_stock = current_stock + $1, updated_at = now() WHERE id = $2',
          [delta, ingredient_id]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(movementRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('recordStockMovement error:', err);
    res.status(500).json({ error: 'Failed to record stock movement' });
  } finally {
    client.release();
  }
};

export const getStockMovements = async (req, res) => {
  try {
    const result = await query(
      `SELECT sm.*,
              COALESCE(i.name, ct.name) as ingredient_name,
              u.name as created_by_user
       FROM stock_movements sm
       LEFT JOIN ingredients i ON sm.ingredient_id = i.id
       LEFT JOIN customization_templates ct ON sm.customization_template_id = ct.id
       LEFT JOIN users u ON sm.created_by = u.id
       ORDER BY sm.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getStockMovements error:', err);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
};

// --- STOCK IN FROM A PO ANALYSIS ---
// Approve & stock: match analyzed reply items against existing ingredients,
// record a stock_in movement and increment current_stock for each match.
// Cumulative tracking: each PO item carries a `receivedQty` (persisted in
// po_records.items). This endpoint only stocks the remaining balance
// (qty - receivedQty) per item, capping at the ordered quantity so a later
// supplier reply covering the same delivery can never over-stock. When every
// item is fully received the PO is auto-completed.
export const stockInFromPo = async (req, res) => {
  const { poCode, items = [], messageId } = req.body;
  const created_by = req.user ? req.user.id : null;

  if (!poCode || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'poCode and items are required' });
  }

  const normalizePoCode = (code = '') =>
    String(code).replace(/[^0-9a-z]/gi, '').toUpperCase();

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const poRes = await client.query(
      "SELECT po_code, items, status FROM po_records WHERE translate(po_code, '- ', '') = $1",
      [normalizePoCode(poCode)]
    );
    const po = poRes.rows[0];
    if (!po) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `No purchase order found for ${poCode}` });
    }

    const poItems = Array.isArray(po.items) ? po.items : [];
    const poItemsByKey = new Map(
      poItems.map(it => [String(it.name || '').toLowerCase(), it])
    );

    const stocked = [];
    const unmatched = [];
    const alreadyReceived = [];

    for (const item of items) {
      const name = (item.name || '').trim();
      if (!name) continue;
      const ingRes = await client.query(
        'SELECT * FROM ingredients WHERE LOWER(TRIM(name)) = LOWER($1) AND is_active = true',
        [name]
      );
      const ing = ingRes.rows[0];
      const poItem = poItemsByKey.get(name.toLowerCase());
      const requested = parseFloat(item.quantity) || 0;
      const orderedQty = poItem ? parseFloat(poItem.qty) || 0 : 0;
      const receivedQty = poItem ? parseFloat(poItem.receivedQty) || 0 : 0;
      const remaining = Math.max(0, orderedQty - receivedQty);
      // Cap at the remaining balance: never stock past the ordered quantity.
      const quantity = Math.min(requested, remaining);

      if (!ing || requested <= 0) {
        unmatched.push({ name, quantity: item.quantity, unit: item.unit });
        continue;
      }
      if (quantity <= 0) {
        alreadyReceived.push({
          name,
          requested: item.quantity,
          receivedQty,
          orderedQty,
          unit: item.unit,
        });
        continue;
      }
      await client.query(
        `INSERT INTO stock_movements (ingredient_id, type, quantity, reference_order_id, note, created_by)
         VALUES ($1, 'stock_in', $2, NULL, $3, $4)`,
        [ing.id, quantity, `Stock in from PO ${po.po_code}`, created_by]
      );
      await client.query(
        'UPDATE ingredients SET current_stock = current_stock + $1, updated_at = now() WHERE id = $2',
        [quantity, ing.id]
      );
      if (poItem) {
        poItem.receivedQty = receivedQty + quantity;
        poItem.remaining = Math.max(0, orderedQty - (receivedQty + quantity));
      }
      stocked.push({
        id: ing.id,
        name: ing.name,
        quantity,
        unit: ing.unit,
        unit_cost: parseFloat(ing.unit_cost) || 0,
        orderedQty,
        receivedQty: poItem ? poItem.receivedQty : quantity,
        remaining: poItem ? poItem.remaining : 0,
      });
    }

    // Persist updated receivedQty on the PO and auto-complete when everything is in.
    const allReceived = poItems.length > 0
      && poItems.every(it => (parseFloat(it.qty) || 0) <= (parseFloat(it.receivedQty) || 0));
    const nextStatus = allReceived && po.status !== 'Completed'
      ? 'Completed'
      : po.status;
    await client.query(
      'UPDATE po_records SET items = $1, status = $2 WHERE po_code = $3',
      [JSON.stringify(poItems), nextStatus, po.po_code]
    );

    if (messageId) {
      try {
        await client.query(
          'UPDATE supplier_messages SET stocked_at = now() WHERE id = $1',
          [messageId]
        );
      } catch (err) {
        console.warn('mark message stocked failed:', err.message);
      }
    }

    await client.query('COMMIT');
    res.json({
      poCode: po.po_code,
      stocked,
      unmatched,
      alreadyReceived,
      completed: allReceived,
      status: nextStatus,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('stockInFromPo error:', err);
    res.status(500).json({ error: 'Failed to stock items' });
  } finally {
    client.release();
  }
};

// --- REVERSE STOCK FROM A PO (supplier contradiction) ---
// When a supplier reply that arrived AFTER a stock-in now says those items are
// out of stock / cannot be delivered, undo the phantom stock: record a
// stock_out movement per previously-stocked item, decrement current_stock,
// reset that item's receivedQty, and reopen the PO.
export const reverseStockFromPo = async (req, res) => {
  const { poCode } = req.body;
  const created_by = req.user ? req.user.id : null;

  if (!poCode) {
    return res.status(400).json({ error: 'poCode is required' });
  }

  const normalizePoCode = (code = '') =>
    String(code).replace(/[^0-9a-z]/gi, '').toUpperCase();

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const poRes = await client.query(
      "SELECT po_code, items, status FROM po_records WHERE translate(po_code, '- ', '') = $1",
      [normalizePoCode(poCode)]
    );
    const po = poRes.rows[0];
    if (!po) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `No purchase order found for ${poCode}` });
    }

    const poItems = Array.isArray(po.items) ? po.items : [];
    const reversed = [];
    const skipped = [];

    for (const poItem of poItems) {
      const name = String(poItem.name || '').trim();
      const receivedQty = parseFloat(poItem.receivedQty) || 0;
      if (!name || receivedQty <= 0) continue;

      const ingRes = await client.query(
        'SELECT * FROM ingredients WHERE LOWER(TRIM(name)) = LOWER($1) AND is_active = true',
        [name]
      );
      const ing = ingRes.rows[0];
      if (!ing) {
        skipped.push({ name, quantity: receivedQty, reason: 'not matched in inventory' });
        continue;
      }

      await client.query(
        `INSERT INTO stock_movements (ingredient_id, type, quantity, reference_order_id, note, created_by)
         VALUES ($1, 'stock_out', $2, NULL, $3, $4)`,
        [ing.id, receivedQty, `Reverse stock from PO ${po.po_code} (supplier out of stock)`, created_by]
      );
      await client.query(
        'UPDATE ingredients SET current_stock = current_stock - $1, updated_at = now() WHERE id = $2',
        [receivedQty, ing.id]
      );
      poItem.receivedQty = 0;
      poItem.remaining = parseFloat(poItem.qty) || 0;
      reversed.push({
        id: ing.id,
        name: ing.name,
        quantity: receivedQty,
        unit: ing.unit,
        unit_cost: parseFloat(ing.unit_cost) || 0,
      });
    }

    // Reopen the PO: back to In Transit (it was agreed) unless it was never
    // advanced; never completed while items were reversed.
    const anyReceived = poItems.some(it => (parseFloat(it.receivedQty) || 0) > 0);
    const nextStatus = anyReceived ? 'In Transit' : 'Pending Approval';

    await client.query(
      'UPDATE po_records SET items = $1, status = $2 WHERE po_code = $3',
      [JSON.stringify(poItems), nextStatus, po.po_code]
    );

    await client.query('COMMIT');
    res.json({
      poCode: po.po_code,
      reversed,
      skipped,
      status: nextStatus,
      reopened: true,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('reverseStockFromPo error:', err);
    res.status(500).json({ error: 'Failed to reverse stock' });
  } finally {
    client.release();
  }
};

// --- RECIPES ---
export const createRecipe = async (req, res) => {
  const { product_id, product_customization_id, ingredient_id, qty_required } = req.body;
  try {
    const result = await query(
      `INSERT INTO recipes (product_id, product_customization_id, ingredient_id, qty_required)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [product_id || null, product_customization_id || null, ingredient_id, qty_required]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createRecipe error:', err);
    res.status(500).json({ error: 'Failed to create recipe item' });
  }
};

export const replaceProductRecipe = async (req, res) => {
  const { product_id } = req.params;
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items array is required' });
  }
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM recipes WHERE product_id = $1 AND product_customization_id IS NULL', [product_id]);
    for (const item of items) {
      if (!item.ingredient_id) continue;
      await client.query(
        `INSERT INTO recipes (product_id, ingredient_id, qty_required)
         VALUES ($1, $2, $3)`,
        [product_id, item.ingredient_id, item.qty_required || 0]
      );
    }
    await client.query('COMMIT');
    const result = await query(
      `SELECT r.id AS recipe_id, r.ingredient_id, r.qty_required, i.name AS ingredient_name, i.unit
       FROM recipes r
       JOIN ingredients i ON i.id = r.ingredient_id
       WHERE r.product_id = $1
       ORDER BY r.id ASC`,
      [product_id]
    );
    res.json(result.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('replaceProductRecipe error:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  } finally {
    client.release();
  }
};

// --- RECIPE LIBRARY (predefined BOM templates) ---
export const getRecipeTemplates = async (req, res) => {
  try {
    const templates = await query(
      'SELECT * FROM recipe_templates WHERE is_active = true ORDER BY name ASC'
    );
    const result = [];
    for (const t of templates.rows) {
      const items = await query(
        `SELECT rti.id, rti.ingredient_id, rti.qty_required,
                i.name AS ingredient_name, i.unit
         FROM recipe_template_items rti
         JOIN ingredients i ON i.id = rti.ingredient_id
         WHERE rti.recipe_template_id = $1
         ORDER BY rti.id ASC`,
        [t.id]
      );
      result.push({ ...t, items: items.rows });
    }
    res.json(result);
  } catch (err) {
    console.error('getRecipeTemplates error:', err);
    res.status(500).json({ error: 'Failed to fetch recipe templates' });
  }
};

export const createRecipeTemplate = async (req, res) => {
  const { name, items } = req.body;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const tRes = await client.query(
      'INSERT INTO recipe_templates (name) VALUES ($1) RETURNING *',
      [name]
    );
    const template = tRes.rows[0];
    for (const item of items || []) {
      if (!item.ingredient_id) continue;
      await client.query(
        `INSERT INTO recipe_template_items (recipe_template_id, ingredient_id, qty_required)
         VALUES ($1, $2, $3)`,
        [template.id, item.ingredient_id, item.qty_required || 0]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(template);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createRecipeTemplate error:', err);
    res.status(500).json({ error: 'Failed to create recipe template' });
  } finally {
    client.release();
  }
};

export const updateRecipeTemplate = async (req, res) => {
  const { id } = req.params;
  const { name, items } = req.body;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    if (name) {
      await client.query(
        'UPDATE recipe_templates SET name = $1, created_at = now() WHERE id = $2',
        [name, id]
      );
    }
    await client.query('DELETE FROM recipe_template_items WHERE recipe_template_id = $1', [id]);
    for (const item of items || []) {
      if (!item.ingredient_id) continue;
      await client.query(
        `INSERT INTO recipe_template_items (recipe_template_id, ingredient_id, qty_required)
         VALUES ($1, $2, $3)`,
        [id, item.ingredient_id, item.qty_required || 0]
      );
    }
    await client.query('COMMIT');
    res.json({ id, name, items });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateRecipeTemplate error:', err);
    res.status(500).json({ error: 'Failed to update recipe template' });
  } finally {
    client.release();
  }
};

export const deleteRecipeTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE recipe_templates SET is_active = false WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteRecipeTemplate error:', err);
    res.status(500).json({ error: 'Failed to delete recipe template' });
  }
};

// --- SUPPLIERS & PURCHASE ORDERS ---
export const getSuppliers = async (req, res) => {
  try {
    const result = await query('SELECT * FROM suppliers WHERE is_active = true ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('getSuppliers error:', err);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

export const createSupplier = async (req, res) => {
  const { name, contact_person, phone, email } = req.body;
  try {
    const result = await query(
      'INSERT INTO suppliers (name, contact_person, phone, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, contact_person || null, phone || null, email || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createSupplier error:', err);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};
