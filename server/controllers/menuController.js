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
      // Get Customizations
      const customizationsRes = await query(
        'SELECT * FROM product_customizations WHERE product_id = $1 AND is_active = true ORDER BY price_delta ASC',
        [product.id]
      );
      product.customizations = customizationsRes.rows;

      // Get Addons
      const addonsRes = await query(
        `SELECT a.* FROM addons a
         JOIN product_addons pa ON a.id = pa.addon_id
         WHERE pa.product_id = $1 AND a.is_active = true`,
        [product.id]
      );
      product.addons = addonsRes.rows;

      // Get Temperatures
      const tempsRes = await query(
        `SELECT t.* FROM temperature_options t
         JOIN product_temperatures pt ON t.id = pt.temperature_id
         WHERE pt.product_id = $1 AND t.is_active = true
         ORDER BY t.id ASC`,
        [product.id]
      );
      product.temperatures = tempsRes.rows;

      // Get Milks
      const milksRes = await query(
        `SELECT m.* FROM milk_options m
         JOIN product_milks pm ON m.id = pm.milk_id
         WHERE pm.product_id = $1 AND m.is_active = true
         ORDER BY m.id ASC`,
        [product.id]
      );
      product.milks = milksRes.rows;

      // Get Recipe BOM items
      const recipeRes = await query(
        `SELECT r.id AS recipe_id, r.ingredient_id, r.qty_required, i.name AS ingredient_name, i.unit
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
  const { category_id, name, description, base_price, image_url, sort_order, addons, temperature_ids, milk_ids, customizations } = req.body;

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

    if (Array.isArray(addons)) {
      for (let addonId of addons) {
        await query('INSERT INTO product_addons (product_id, addon_id) VALUES ($1, $2)', [product.id, addonId]);
      }
    }

    if (Array.isArray(customizations)) {
      for (let c of customizations) {
        if (!c.name || !c.name.trim()) continue;
        await query(
          'INSERT INTO product_customizations (product_id, name, customization_type, price_delta, is_default) VALUES ($1, $2, $3, $4, $5)',
          [product.id, c.name.trim(), c.customization_type || 'option', c.price_delta || 0, c.is_default || false]
        );
      }
    }

    if (Array.isArray(temperature_ids)) {
      for (let tid of temperature_ids) {
        await query('INSERT INTO product_temperatures (product_id, temperature_id) VALUES ($1, $2)', [product.id, tid]);
      }
    }

    if (Array.isArray(milk_ids)) {
      for (let mid of milk_ids) {
        await query('INSERT INTO product_milks (product_id, milk_id) VALUES ($1, $2)', [product.id, mid]);
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
  const { category_id, name, description, base_price, image_url, is_active, sort_order, addons, temperature_ids, milk_ids, customizations } = req.body;

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

    if (addons && Array.isArray(addons)) {
      await query('DELETE FROM product_addons WHERE product_id = $1', [id]);
      for (let addonId of addons) {
        await query('INSERT INTO product_addons (product_id, addon_id) VALUES ($1, $2)', [id, addonId]);
      }
    }

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

    if (temperature_ids !== undefined) {
      await query('DELETE FROM product_temperatures WHERE product_id = $1', [id]);
      if (Array.isArray(temperature_ids)) {
        for (let tid of temperature_ids) {
          await query('INSERT INTO product_temperatures (product_id, temperature_id) VALUES ($1, $2)', [id, tid]);
        }
      }
    }

    if (milk_ids !== undefined) {
      await query('DELETE FROM product_milks WHERE product_id = $1', [id]);
      if (Array.isArray(milk_ids)) {
        for (let mid of milk_ids) {
          await query('INSERT INTO product_milks (product_id, milk_id) VALUES ($1, $2)', [id, mid]);
        }
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
  const { name, customization_type, default_price_delta } = req.body;
  try {
    const result = await query(
      `INSERT INTO customization_templates (name, customization_type, default_price_delta)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, customization_type || 'option', default_price_delta || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createCustomizationTemplate error:', err);
    res.status(500).json({ error: 'Failed to create customization template' });
  }
};

export const updateCustomizationTemplate = async (req, res) => {
  const { id } = req.params;
  const { name, customization_type, default_price_delta, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE customization_templates
       SET name = COALESCE($1, name),
           customization_type = COALESCE($2, customization_type),
           default_price_delta = COALESCE($3, default_price_delta),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 RETURNING *`,
      [name, customization_type, default_price_delta, is_active, id]
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

// --- ADDONS ---
export const getAddons = async (req, res) => {
  try {
    const result = await query('SELECT * FROM addons WHERE is_active = true ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('getAddons error:', err);
    res.status(500).json({ error: 'Failed to fetch addons' });
  }
};

export const createAddon = async (req, res) => {
  const { name, price } = req.body;
  try {
    const result = await query(
      'INSERT INTO addons (name, price) VALUES ($1, $2) RETURNING *',
      [name, price || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createAddon error:', err);
    res.status(500).json({ error: 'Failed to create addon' });
  }
};

export const updateAddon = async (req, res) => {
  const { id } = req.params;
  const { name, price, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE addons
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 RETURNING *`,
      [name, price, is_active, id]
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
    await query('UPDATE addons SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Add-on deactivated successfully' });
  } catch (err) {
    console.error('deleteAddon error:', err);
    res.status(500).json({ error: 'Failed to delete addon' });
  }
};

// --- TEMPERATURE OPTIONS ---
export const getTemperatureOptions = async (req, res) => {
  try {
    const result = await query('SELECT * FROM temperature_options WHERE is_active = true ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('getTemperatureOptions error:', err);
    res.status(500).json({ error: 'Failed to fetch temperature options' });
  }
};

export const createTemperatureOption = async (req, res) => {
  const { name, price_delta } = req.body;
  try {
    const result = await query(
      'INSERT INTO temperature_options (name, price_delta) VALUES ($1, $2) RETURNING *',
      [name, price_delta || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createTemperatureOption error:', err);
    res.status(500).json({ error: 'Failed to create temperature option' });
  }
};

export const updateTemperatureOption = async (req, res) => {
  const { id } = req.params;
  const { name, price_delta, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE temperature_options
       SET name = COALESCE($1, name),
           price_delta = COALESCE($2, price_delta),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 RETURNING *`,
      [name, price_delta, is_active, id]
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
    await query('UPDATE temperature_options SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Temperature option deactivated successfully' });
  } catch (err) {
    console.error('deleteTemperatureOption error:', err);
    res.status(500).json({ error: 'Failed to delete temperature option' });
  }
};

// --- MILK OPTIONS ---
export const getMilkOptions = async (req, res) => {
  try {
    const result = await query('SELECT * FROM milk_options WHERE is_active = true ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('getMilkOptions error:', err);
    res.status(500).json({ error: 'Failed to fetch milk options' });
  }
};

export const createMilkOption = async (req, res) => {
  const { name, price_delta } = req.body;
  try {
    const result = await query(
      'INSERT INTO milk_options (name, price_delta) VALUES ($1, $2) RETURNING *',
      [name, price_delta || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createMilkOption error:', err);
    res.status(500).json({ error: 'Failed to create milk option' });
  }
};

export const updateMilkOption = async (req, res) => {
  const { id } = req.params;
  const { name, price_delta, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE milk_options
       SET name = COALESCE($1, name),
           price_delta = COALESCE($2, price_delta),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 RETURNING *`,
      [name, price_delta, is_active, id]
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
    await query('UPDATE milk_options SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Milk option deactivated successfully' });
  } catch (err) {
    console.error('deleteMilkOption error:', err);
    res.status(500).json({ error: 'Failed to delete milk option' });
  }
};
