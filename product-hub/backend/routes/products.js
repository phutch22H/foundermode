const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  const { name, description, status, stage, mrr, active_users } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name required' });

  try {
    const result = await pool.query(
      `INSERT INTO products (user_id, name, description, status, stage, mrr, active_users)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, name, description || null, status || 'planning', stage || 'idea', mrr || 0, active_users || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const { name, description, status, stage, mrr, active_users } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           stage = COALESCE($4, stage),
           mrr = COALESCE($5, mrr),
           active_users = COALESCE($6, active_users),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [name, description, status, stage, mrr, active_users, req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:id/context
router.get('/:id/context', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, context_doc FROM products WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: result.rows[0].id, name: result.rows[0].name, context_doc: result.rows[0].context_doc || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/products/:id/context
router.put('/:id/context', async (req, res) => {
  const { context_doc } = req.body;
  if (context_doc === undefined) return res.status(400).json({ error: 'context_doc required' });
  try {
    const result = await pool.query(
      'UPDATE products SET context_doc = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id, name, context_doc',
      [context_doc, req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
