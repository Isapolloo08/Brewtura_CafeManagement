import { query } from '../db/index.js';

const ensureTables = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS po_records (
        id                SERIAL PRIMARY KEY,
        po_code           VARCHAR(20) UNIQUE NOT NULL,
        supplier          VARCHAR(150),
        supplier_email    VARCHAR(150),
        ordered_date      DATE,
        expected_delivery DATE,
        total_cost        NUMERIC(12,2) NOT NULL DEFAULT 0,
        status            VARCHAR(30) NOT NULL DEFAULT 'Pending Approval',
        items             JSONB,
        created_by        INTEGER,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.warn('ensureTables (purchase orders) skipped:', err.message);
  }
};

ensureTables();

const toFrontend = (row) => ({
  id: row.po_code,
  supplier: row.supplier || '',
  supplierEmail: row.supplier_email || '',
  date: formatDate(row.ordered_date),
  expectedDelivery: formatDate(row.expected_delivery),
  totalCost: parseFloat(row.total_cost) || 0,
  status: row.status || 'Pending Approval',
  itemsList: (row.items || []).map(item => ({
    ...item,
    receivedQty: item.receivedQty != null ? Number(item.receivedQty) || 0 : 0,
  })),
});

// Ensure every item carries a receivedQty (default 0). When existing items are
// provided (e.g. editing a PO), preserve their already-received quantities so
// cumulative tracking isn't reset.
const normalizeItems = (items, existingItems = []) => {
  const list = Array.isArray(items) ? items : [];
  const existing = new Map(
    (Array.isArray(existingItems) ? existingItems : [])
      .map(it => [String(it.name || '').toLowerCase(), Number(it.receivedQty) || 0])
  );
  return list.map((it) => {
    const key = String(it.name || '').toLowerCase();
    const receivedQty = it.receivedQty != null ? Number(it.receivedQty) || 0
      : (existing.has(key) ? existing.get(key) : 0);
    return { ...it, receivedQty };
  });
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getPurchaseOrders = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM po_records ORDER BY created_at DESC LIMIT 200'
    );
    res.json(result.rows.map(toFrontend));
  } catch (err) {
    console.error('getPurchaseOrders error:', err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

export const createPurchaseOrder = async (req, res) => {
  const {
    id,
    supplier,
    supplierEmail,
    date,
    expectedDelivery,
    totalCost,
    status,
    itemsList,
  } = req.body;
  const created_by = req.user ? req.user.id : null;

  if (!id || !supplier) {
    return res.status(400).json({ error: 'id and supplier are required' });
  }

  try {
    // On upsert, preserve already-received quantities from the existing PO.
    const existingRow = await query(
      'SELECT items FROM po_records WHERE po_code = $1',
      [id]
    ).then(r => r.rows[0]).catch(() => null);
    const normalizedItems = normalizeItems(itemsList, existingRow?.items);

    const result = await query(
      `INSERT INTO po_records (po_code, supplier, supplier_email, ordered_date, expected_delivery, total_cost, status, items, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (po_code) DO UPDATE SET
         supplier = EXCLUDED.supplier,
         supplier_email = EXCLUDED.supplier_email,
         ordered_date = EXCLUDED.ordered_date,
         expected_delivery = EXCLUDED.expected_delivery,
         total_cost = EXCLUDED.total_cost,
         status = EXCLUDED.status,
         items = EXCLUDED.items
       RETURNING *`,
      [
        id,
        supplier,
        supplierEmail || null,
        date || null,
        expectedDelivery || null,
        parseFloat(totalCost) || 0,
        status || 'Pending Approval',
        JSON.stringify(normalizedItems),
        created_by,
      ]
    );
    res.status(201).json(toFrontend(result.rows[0]));
  } catch (err) {
    console.error('createPurchaseOrder error:', err);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
};

export const updatePurchaseOrderStatus = async (req, res) => {
  const { poCode } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  try {
    const result = await query(
      'UPDATE po_records SET status = $1, expected_delivery = COALESCE($2, expected_delivery) WHERE po_code = $3 RETURNING *',
      [status, req.body.expectedDelivery || null, poCode]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    res.json(toFrontend(result.rows[0]));
  } catch (err) {
    console.error('updatePurchaseOrderStatus error:', err);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  const { poCode } = req.params;
  const {
    supplier,
    supplierEmail,
    date,
    expectedDelivery,
    totalCost,
    status,
    itemsList,
  } = req.body;

  try {
    const existingRow = await query(
      'SELECT items FROM po_records WHERE po_code = $1',
      [poCode]
    ).then(r => r.rows[0]).catch(() => null);
    const normalizedItems = itemsList ? normalizeItems(itemsList, existingRow?.items) : null;

    const result = await query(
      `UPDATE po_records SET
         supplier = COALESCE($1, supplier),
         supplier_email = COALESCE($2, supplier_email),
         ordered_date = COALESCE($3, ordered_date),
         expected_delivery = COALESCE($4, expected_delivery),
         total_cost = COALESCE($5, total_cost),
         status = COALESCE($6, status),
         items = COALESCE($7, items)
       WHERE po_code = $8 RETURNING *`,
      [
        supplier || null,
        supplierEmail || null,
        date || null,
        expectedDelivery || null,
        totalCost != null ? parseFloat(totalCost) : null,
        status || null,
        normalizedItems ? JSON.stringify(normalizedItems) : null,
        poCode,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    res.json(toFrontend(result.rows[0]));
  } catch (err) {
    console.error('updatePurchaseOrder error:', err);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  const { poCode } = req.params;

  try {
    const result = await query('DELETE FROM po_records WHERE po_code = $1 RETURNING *', [poCode]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    res.json({ success: true, id: result.rows[0].po_code });
  } catch (err) {
    console.error('deletePurchaseOrder error:', err);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
};
