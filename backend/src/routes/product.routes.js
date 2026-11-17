const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { requiredText, optionalNumber } = require('../utils/validation');
router.use(auth);

const fields = `p.id, p.name, p.sku, p.description, p.quantity_on_hand AS quantityOnHand,
 p.cost_price AS costPrice, p.selling_price AS sellingPrice,
 p.low_stock_threshold AS lowStockThreshold, p.created_at AS createdAt, p.updated_at AS updatedAt`;

function validateProduct(body) {
  const { name, sku, quantityOnHand, costPrice, sellingPrice, lowStockThreshold } = body;
  if (!requiredText(name, 180) || !requiredText(sku, 80)) return 'Name and SKU are required.';
  if (!Number.isInteger(Number(quantityOnHand)) || Number(quantityOnHand) < 0) return 'Quantity must be a non-negative whole number.';
  if (!optionalNumber(costPrice) || !optionalNumber(sellingPrice)) return 'Prices must be non-negative numbers.';
  if (lowStockThreshold !== '' && lowStockThreshold !== null && lowStockThreshold !== undefined &&
      (!Number.isInteger(Number(lowStockThreshold)) || Number(lowStockThreshold) < 0)) {
    return 'Low-stock threshold must be a non-negative whole number.';
  }
  return null;
}

router.get('/', async (req, res) => {
  try {
    const search = `%${String(req.query.search || '').trim()}%`;
    const [rows] = await db.execute(
      `SELECT ${fields},
       COALESCE(p.low_stock_threshold, o.default_low_stock_threshold) AS effectiveLowStockThreshold,
       (p.quantity_on_hand <= COALESCE(p.low_stock_threshold, o.default_low_stock_threshold)) AS isLowStock
       FROM products p JOIN organizations o ON o.id = p.organization_id
       WHERE p.organization_id = ? AND (p.name LIKE ? OR p.sku LIKE ?)
       ORDER BY p.updated_at DESC`,
      [req.user.organizationId, search, search]
    );
    res.json({ products: rows });
  } catch (error) {
    res.status(500).json({ message: 'Could not load products.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ${fields} FROM products p WHERE p.id = ? AND p.organization_id = ?`,
      [req.params.id, req.user.organizationId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Product not found.' });
    res.json({ product: rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Could not load product.' });
  }
});

router.post('/', async (req, res) => {
  const errorMessage = validateProduct(req.body);
  if (errorMessage) return res.status(400).json({ message: errorMessage });
  const b = req.body;
  try {
    const [result] = await db.execute(
      `INSERT INTO products
       (organization_id, name, sku, description, quantity_on_hand, cost_price, selling_price, low_stock_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.organizationId, b.name.trim(), b.sku.trim(), b.description || null,
       Number(b.quantityOnHand), b.costPrice === '' ? null : (b.costPrice ?? null),
       b.sellingPrice === '' ? null : (b.sellingPrice ?? null),
       b.lowStockThreshold === '' ? null : (b.lowStockThreshold ?? null)]
    );
    res.status(201).json({ message: 'Product created.', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This SKU already exists in your organization.' });
    console.error(error);
    res.status(500).json({ message: 'Could not create product.' });
  }
});

router.put('/:id', async (req, res) => {
  const errorMessage = validateProduct(req.body);
  if (errorMessage) return res.status(400).json({ message: errorMessage });
  const b = req.body;
  try {
    const [result] = await db.execute(
      `UPDATE products SET name=?, sku=?, description=?, quantity_on_hand=?,
       cost_price=?, selling_price=?, low_stock_threshold=?
       WHERE id=? AND organization_id=?`,
      [b.name.trim(), b.sku.trim(), b.description || null, Number(b.quantityOnHand),
       b.costPrice === '' ? null : (b.costPrice ?? null),
       b.sellingPrice === '' ? null : (b.sellingPrice ?? null),
       b.lowStockThreshold === '' ? null : (b.lowStockThreshold ?? null),
       req.params.id, req.user.organizationId]
    );
    if (!result.affectedRows) {
      const [existing] = await db.execute(
        'SELECT id FROM products WHERE id = ? AND organization_id = ?',
        [req.params.id, req.user.organizationId]
      );
      if (!existing.length) return res.status(404).json({ message: 'Product not found.' });
    }
    res.json({ message: 'Product updated.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This SKU already exists in your organization.' });
    res.status(500).json({ message: 'Could not update product.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM products WHERE id = ? AND organization_id = ?',
      [req.params.id, req.user.organizationId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete product.' });
  }
});

module.exports = router;
