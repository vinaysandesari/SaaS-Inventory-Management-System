const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');
const { emailPattern, requiredText } = require('../utils/validation');

function makeToken(userId, organizationId) {
  return jwt.sign({ userId, organizationId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
}

router.post('/signup', async (req, res) => {
  const { email, password, organizationName } = req.body;
  if (!emailPattern.test(String(email || '').trim()) ||
      !requiredText(password, 100) || password.length < 8 ||
      !requiredText(organizationName, 150)) {
    return res.status(400).json({ message: 'Enter a valid email, an organization name, and a password of at least 8 characters.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const [org] = await connection.execute(
      'INSERT INTO organizations (name) VALUES (?)', [organizationName.trim()]
    );
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await connection.execute(
      'INSERT INTO users (organization_id, email, password_hash) VALUES (?, ?, ?)',
      [org.insertId, email.trim().toLowerCase(), passwordHash]
    );
    await connection.commit();
    const token = makeToken(user.insertId, org.insertId);
    res.status(201).json({
      token,
      user: { id: user.insertId, email: email.trim().toLowerCase(), organizationId: org.insertId, organizationName: organizationName.trim() }
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with this email already exists.' });
    res.status(500).json({ message: 'Could not create account.' });
  } finally {
    connection.release();
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.password_hash, u.organization_id, o.name AS organization_name
       FROM users u JOIN organizations o ON o.id = u.organization_id WHERE u.email = ?`,
      [email]
    );
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const user = rows[0];
    res.json({
      token: makeToken(user.id, user.organization_id),
      user: { id: user.id, email: user.email, organizationId: user.organization_id, organizationName: user.organization_name }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed.' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.organization_id AS organizationId, o.name AS organizationName
       FROM users u JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = ? AND u.organization_id = ?`,
      [req.user.id, req.user.organizationId]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Could not load user.' });
  }
});

module.exports = router;
