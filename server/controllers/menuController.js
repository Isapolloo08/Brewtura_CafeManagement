import { query } from '../db/index.js';

// --- CATEGORIES ---
export const getCategories = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM categories WHERE is_active = true ORDER BY sort_order ASC, name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req, res) => {
  const { branch_id, name, sort_order } = req.body;
  try {
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null || isNaN(Number(finalSortOrder))) {
      const orderRes = await query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories');
      finalSortOrder = orderRes.rows[0].next;
    }
    const result = await query(
      `INSERT INTO categories (branch_id, name, sort_order)
       VALUES ($1, $2, $3) RETURNING *`,
      [branch_id || null, name, Number(finalSortOrder)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createCategory error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, sort_order, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           sort_order = COALESCE($2, sort_order),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 RETURNING *`,
      [name, sort_order, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateCategory error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE categories SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Category deactivated successfully' });
  } catch (err) {
    console.error('deleteCategory error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// --- PRODUCTS ---
export const getProducts = async (req, res) => {
  try {
    const productsRes = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = true
       ORDER BY p.sort_order ASC, p.name ASC`
    );

    const products = productsRes.rows;

    for (let product of products) {
      // Get Customizations (sizes/options + temperature/milk/addon selections)
      const customizationsRes = await query(
        'SELECT * FROM product_customizations WHERE product_id = $1 AND is_active = true ORDER BY price_delta ASC',
        [product.id]
      );
      const customizationRows = customizationsRes.rows;
      product.customizations = customizationRows.filter(c => !['temperature', 'milk', 'addon'].includes(c.customization_type));
      product.temperatures = customizationRows
        .filter(c => c.customization_type === 'temperature')
        .map(c => ({ id: c.id, name: c.name, price_delta: parseFloat(c.price_delta) }));
      product.milks = customizationRows
        .filter(c => c.customization_type === 'milk')
        .map(c => ({ id: c.id, name: c.name, price_delta: parseFloat(c.price_delta) }));
      product.addons = customizationRows
        .filter(c => c.customization_type === 'addon')
        .map(c => ({ id: c.id, name: c.name, price: parseFloat(c.price_delta) }));

      // Get Recipe BOM items
      const recipeRes = await query(
        `SELECT r.id AS recipe_id, r.ingredient_id, r.product_customization_id, r.qty_required, i.name AS ingredient_name, i.unit
         FROM recipes r
         JOIN ingredients i ON i.id = r.ingredient_id
         WHERE r.product_id = $1
         ORDER BY r.id ASC`,
        [product.id]
      );
      product.recipe = recipeRes.rows;
    }

    res.json(products);
  } catch (err) {
    console.error('getProducts error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const createProduct = async (req, res) => {
  const { category_id, name, description, base_price, image_url, sort_order, customizations } = req.body;

  try {
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null || isNaN(Number(finalSortOrder))) {
      const catRes = await query('SELECT sort_order FROM categories WHERE id = $1', [category_id]);
      finalSortOrder = catRes.rows.length > 0 ? (catRes.rows[0].sort_order ?? 0) : 0;
    }

    const result = await query(
      `INSERT INTO products (category_id, name, description, base_price, image_url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [category_id, name, description || '', base_price, image_url || null, Number(finalSortOrder)]
    );

    const product = result.rows[0];

    await query('UPDATE categories SET sort_order = sort_order + 1 WHERE id = $1', [category_id]);

    if (Array.isArray(customizations)) {
      for (let c of customizations) {
        if (!c.name || !c.name.trim()) continue;
        await query(
          'INSERT INTO product_customizations (product_id, name, customization_type, price_delta, is_default) VALUES ($1, $2, $3, $4, $5)',
          [product.id, c.name.trim(), c.customization_type || 'option', c.price_delta || 0, c.is_default || false]
        );
      }
    }

    res.status(201).json(product);
  } catch (err) {
    console.error('createProduct error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE products SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('deleteProduct error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { category_id, name, description, base_price, image_url, is_active, sort_order, customizations } = req.body;

  try {
    const result = await query(
      `UPDATE products
       SET category_id = COALESCE($1, category_id),
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           base_price = COALESCE($4, base_price),
           image_url = COALESCE($5, image_url),
           is_active = COALESCE($6, is_active),
           sort_order = COALESCE($7, sort_order),
           updated_at = now()
       WHERE id = $8 RETURNING *`,
      [category_id, name, description, base_price, image_url, is_active, sort_order, id]
    );

    if (Array.isArray(customizations)) {
      await query('DELETE FROM product_customizations WHERE product_id = $1', [id]);
      for (let c of customizations) {
        if (!c.name || !c.name.trim()) continue;
        await query(
          'INSERT INTO product_customizations (product_id, name, customization_type, price_delta, is_default) VALUES ($1, $2, $3, $4, $5)',
          [id, c.name.trim(), c.customization_type || 'option', c.price_delta || 0, c.is_default || false]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateProduct error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// --- PRODUCT CUSTOMIZATIONS ---
export const getCustomizationTemplates = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM customization_templates WHERE is_active = true ORDER BY customization_type ASC, name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCustomizationTemplates error:', err);
    res.status(500).json({ error: 'Failed to fetch customization templates' });
  }
};

export const createCustomizationTemplate = async (req, res) => {
  const { name, customization_type, default_price_delta, stock } = req.body;
  try {
    const result = await query(
      `INSERT INTO customization_templates (name, customization_type, default_price_delta, stock)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, customization_type || 'option', default_price_delta || 0, stock !== undefined ? Number(stock) : 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createCustomizationTemplate error:', err);
    res.status(500).json({ error: 'Failed to create customization template' });
  }
};

export const updateCustomizationTemplate = async (req, res) => {
  const { id } = req.params;
  const { name, customization_type, default_price_delta, stock, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE customization_templates
       SET name = COALESCE($1, name),
           customization_type = COALESCE($2, customization_type),
           default_price_delta = COALESCE($3, default_price_delta),
           stock = COALESCE($4, stock),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [name, customization_type, default_price_delta, stock !== undefined ? Number(stock) : null, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateCustomizationTemplate error:', err);
    res.status(500).json({ error: 'Failed to update customization template' });
  }
};

export const deleteCustomizationTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE customization_templates SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Customization template deactivated successfully' });
  } catch (err) {
    console.error('deleteCustomizationTemplate error:', err);
    res.status(500).json({ error: 'Failed to delete customization template' });
  }
};

export const createCustomization = async (req, res) => {
  const { product_id, name, price_delta, is_default } = req.body;
  try {
    const result = await query(
      `INSERT INTO product_customizations (product_id, name, price_delta, is_default)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [product_id, name, price_delta || 0, is_default || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createCustomization error:', err);
    res.status(500).json({ error: 'Failed to create customization' });
  }
};

export const getCustomizationRecipes = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT r.id, r.product_id, r.product_customization_id, r.qty_required,
              i.id AS ingredient_id, i.name AS ingredient_name, i.unit, i.unit_cost
       FROM recipes r
       JOIN ingredients i ON i.id = r.ingredient_id
       WHERE r.product_customization_id = $1
       ORDER BY r.id ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getCustomizationRecipes error:', err);
    res.status(500).json({ error: 'Failed to fetch customization recipes' });
  }
};

// --- ADDONS (stored in customization_templates as type 'addon') ---
export const getAddons = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, default_price_delta AS price, stock
       FROM customization_templates
       WHERE customization_type = 'addon' AND is_active = true
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getAddons error:', err);
    res.status(500).json({ error: 'Failed to fetch addons' });
  }
};

export const createAddon = async (req, res) => {
  const { name, price, stock } = req.body;
  try {
    const result = await query(
      `INSERT INTO customization_templates (name, customization_type, default_price_delta, stock)
       VALUES ($1, 'addon', $2, $3)
       ON CONFLICT (name) DO UPDATE
         SET customization_type = EXCLUDED.customization_type,
             default_price_delta = EXCLUDED.default_price_delta,
             stock = EXCLUDED.stock,
             is_active = true
       RETURNING id, name, default_price_delta AS price, stock`,
      [name, price || 0, stock !== undefined ? Number(stock) : 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createAddon error:', err);
    res.status(500).json({ error: 'Failed to create addon' });
  }
};

export const updateAddon = async (req, res) => {
  const { id } = req.params;
  const { name, price, stock, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE customization_templates
       SET name = COALESCE($1, name),
           default_price_delta = COALESCE($2, default_price_delta),
           stock = COALESCE($3, stock),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 AND customization_type = 'addon'
       RETURNING id, name, default_price_delta AS price, stock`,
      [name, price, stock !== undefined ? Number(stock) : null, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateAddon error:', err);
    res.status(500).json({ error: 'Failed to update addon' });
  }
};

export const deleteAddon = async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      `UPDATE customization_templates SET is_active = false
       WHERE id = $1 AND customization_type = 'addon'`,
      [id]
    );
    res.json({ message: 'Add-on deactivated successfully' });
  } catch (err) {
    console.error('deleteAddon error:', err);
    res.status(500).json({ error: 'Failed to delete addon' });
  }
};

// --- TEMPERATURE OPTIONS (stored in customization_templates as type 'temperature') ---
export const getTemperatureOptions = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, default_price_delta AS price_delta, stock
       FROM customization_templates
       WHERE customization_type = 'temperature' AND is_active = true
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getTemperatureOptions error:', err);
    res.status(500).json({ error: 'Failed to fetch temperature options' });
  }
};

export const createTemperatureOption = async (req, res) => {
  const { name, price_delta, stock } = req.body;
  try {
    const result = await query(
      `INSERT INTO customization_templates (name, customization_type, default_price_delta, stock)
       VALUES ($1, 'temperature', $2, $3)
       ON CONFLICT (name) DO UPDATE
         SET customization_type = EXCLUDED.customization_type,
             default_price_delta = EXCLUDED.default_price_delta,
             stock = EXCLUDED.stock,
             is_active = true
       RETURNING id, name, default_price_delta AS price_delta, stock`,
      [name, price_delta || 0, stock !== undefined ? Number(stock) : 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createTemperatureOption error:', err);
    res.status(500).json({ error: 'Failed to create temperature option' });
  }
};

export const updateTemperatureOption = async (req, res) => {
  const { id } = req.params;
  const { name, price_delta, stock, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE customization_templates
       SET name = COALESCE($1, name),
           default_price_delta = COALESCE($2, default_price_delta),
           stock = COALESCE($3, stock),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 AND customization_type = 'temperature'
       RETURNING id, name, default_price_delta AS price_delta, stock`,
      [name, price_delta, stock !== undefined ? Number(stock) : null, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateTemperatureOption error:', err);
    res.status(500).json({ error: 'Failed to update temperature option' });
  }
};

export const deleteTemperatureOption = async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      `UPDATE customization_templates SET is_active = false
       WHERE id = $1 AND customization_type = 'temperature'`,
      [id]
    );
    res.json({ message: 'Temperature option deactivated successfully' });
  } catch (err) {
    console.error('deleteTemperatureOption error:', err);
    res.status(500).json({ error: 'Failed to delete temperature option' });
  }
};

// --- MILK OPTIONS (stored in customization_templates as type 'milk') ---
export const getMilkOptions = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, default_price_delta AS price_delta, stock
       FROM customization_templates
       WHERE customization_type = 'milk' AND is_active = true
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getMilkOptions error:', err);
    res.status(500).json({ error: 'Failed to fetch milk options' });
  }
};

export const createMilkOption = async (req, res) => {
  const { name, price_delta, stock } = req.body;
  try {
    const result = await query(
      `INSERT INTO customization_templates (name, customization_type, default_price_delta, stock)
       VALUES ($1, 'milk', $2, $3)
       ON CONFLICT (name) DO UPDATE
         SET customization_type = EXCLUDED.customization_type,
             default_price_delta = EXCLUDED.default_price_delta,
             stock = EXCLUDED.stock,
             is_active = true
       RETURNING id, name, default_price_delta AS price_delta, stock`,
      [name, price_delta || 0, stock !== undefined ? Number(stock) : 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createMilkOption error:', err);
    res.status(500).json({ error: 'Failed to create milk option' });
  }
};

export const updateMilkOption = async (req, res) => {
  const { id } = req.params;
  const { name, price_delta, stock, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE customization_templates
       SET name = COALESCE($1, name),
           default_price_delta = COALESCE($2, default_price_delta),
           stock = COALESCE($3, stock),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 AND customization_type = 'milk'
       RETURNING id, name, default_price_delta AS price_delta, stock`,
      [name, price_delta, stock !== undefined ? Number(stock) : null, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateMilkOption error:', err);
    res.status(500).json({ error: 'Failed to update milk option' });
  }
};

export const deleteMilkOption = async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      `UPDATE customization_templates SET is_active = false
       WHERE id = $1 AND customization_type = 'milk'`,
      [id]
    );
    res.json({ message: 'Milk option deactivated successfully' });
  } catch (err) {
    console.error('deleteMilkOption error:', err);
    res.status(500).json({ error: 'Failed to delete milk option' });
  }
};
