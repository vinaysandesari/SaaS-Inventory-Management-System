const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT name AS organizationName, default_low_stock_threshold AS defaultThreshold FROM organizations WHERE id = ?',
      [req.user.organizationId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Organization not found.' });
    res.json({ settings: rows[0] });
  } catch {
    res.status(500).json({ message: 'Could not load settings.' });
  }
});

router.put('/', async (req, res) => {
  const value = Number(req.body.defaultThreshold);
  if (!Number.isInteger(value) || value < 0 || value > 1000000) {
    return res.status(400).json({ message: 'Default threshold must be a non-negative whole number.' });
  }
  try {
    await db.execute(
      'UPDATE organizations SET default_low_stock_threshold = ? WHERE id = ?',
      [value, req.user.organizationId]
    );
    res.json({ message: 'Settings saved.' });
  } catch {
    res.status(500).json({ message: 'Could not save settings.' });
  }
});
module.exports = router;
