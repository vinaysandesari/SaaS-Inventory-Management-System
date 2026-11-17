const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const [[summary]] = await db.execute(
      `SELECT COUNT(*) AS totalProducts, COALESCE(SUM(quantity_on_hand), 0) AS totalUnits
       FROM products WHERE organization_id = ?`, [orgId]
    );
    const [settings] = await db.execute(
      'SELECT default_low_stock_threshold AS defaultThreshold FROM organizations WHERE id = ?', [orgId]
    );
    const defaultThreshold = settings[0]?.defaultThreshold ?? 5;
    const [[lowStockSummary]] = await db.execute(
      `SELECT COUNT(*) AS lowStockCount FROM products
       WHERE organization_id = ?
       AND quantity_on_hand <= COALESCE(low_stock_threshold, ?)`,
      [orgId, defaultThreshold]
    );
    const [lowStockItems] = await db.execute(
      `SELECT id, name, sku, quantity_on_hand AS quantityOnHand,
       COALESCE(low_stock_threshold, ?) AS lowStockThreshold
       FROM products
       WHERE organization_id = ?
       AND quantity_on_hand <= COALESCE(low_stock_threshold, ?)
       ORDER BY quantity_on_hand ASC LIMIT 10`,
      [defaultThreshold, orgId, defaultThreshold]
    );
    res.json({
      ...summary,
      totalProducts: Number(summary.totalProducts),
      totalUnits: Number(summary.totalUnits),
      lowStockCount: Number(lowStockSummary.lowStockCount),
      lowStockItems
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load dashboard.' });
  }
});
module.exports = router;
