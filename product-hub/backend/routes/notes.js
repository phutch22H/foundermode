const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(auth);

// GET /api/products/:productId/notes
router.get('/', async (req, res) => {
  try {
    // Verify product belongs to user
    const prod = await pool.query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [req.params.productId, req.userId]
    );
    if (!prod.rows[0]) return res.status(404).json({ error: 'Product not found' });

    const result = await pool.query(
      'SELECT * FROM notes WHERE product_id = $1 ORDER BY created_at DESC',
      [req.params.productId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products/:productId/notes
router.post('/', async (req, res) => {
  const { content, tags, source = 'manual' } = req.body;
  if (!content) return res.status(400).json({ error: 'Note content required' });

  try {
    const prod = await pool.query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [req.params.productId, req.userId]
    );
    if (!prod.rows[0]) return res.status(404).json({ error: 'Product not found' });

    const result = await pool.query(
      'INSERT INTO notes (product_id, user_id, content, tags, source) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.productId, req.userId, content, tags || [], source]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE/PATCH /api/notes/:id  (mounted separately in server.js)
const deleteRouter = express.Router();
deleteRouter.use(auth);

deleteRouter.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/notes/:id — toggle completed / update content
deleteRouter.patch('/:id', async (req, res) => {
  const { completed } = req.body;
  try {
    const result = await pool.query(
      `UPDATE notes
       SET completed = $1,
           completed_at = CASE WHEN $1 = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [completed, req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { notesRouter: router, noteDeleteRouter: deleteRouter };
