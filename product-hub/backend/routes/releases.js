const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

// Nested router: /api/products/:productId/releases
const router = express.Router({ mergeParams: true });
router.use(auth);

// GET /api/products/:productId/releases
router.get('/', async (req, res) => {
  try {
    const prod = await pool.query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [req.params.productId, req.userId]
    );
    if (!prod.rows[0]) return res.status(404).json({ error: 'Product not found' });

    const result = await pool.query(
      `SELECT
         r.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id', n.id,
               'content', n.content,
               'completed_at', n.completed_at,
               'created_at', n.created_at
             ) ORDER BY n.completed_at
           ) FILTER (WHERE n.id IS NOT NULL),
           '[]'
         ) AS tasks
       FROM releases r
       LEFT JOIN release_tasks rt ON rt.release_id = r.id
       LEFT JOIN notes n ON n.id = rt.note_id
       WHERE r.product_id = $1 AND r.user_id = $2
       GROUP BY r.id
       ORDER BY r.released_at DESC`,
      [req.params.productId, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products/:productId/releases
router.post('/', async (req, res) => {
  const { name, description, noteIds = [], released_at } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Release name required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prod = await client.query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [req.params.productId, req.userId]
    );
    if (!prod.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const releaseResult = await client.query(
      `INSERT INTO releases (product_id, user_id, name, description, released_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        req.params.productId,
        req.userId,
        name.trim(),
        description?.trim() || null,
        released_at || new Date(),
      ]
    );
    const release = releaseResult.rows[0];

    // Link selected shipped tasks
    if (noteIds.length > 0) {
      // Verify all notes belong to this product and user
      const notesCheck = await client.query(
        `SELECT id FROM notes WHERE id = ANY($1) AND product_id = $2 AND user_id = $3 AND completed = TRUE`,
        [noteIds, req.params.productId, req.userId]
      );
      for (const note of notesCheck.rows) {
        await client.query(
          'INSERT INTO release_tasks (release_id, note_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [release.id, note.id]
        );
      }
    }

    await client.query('COMMIT');

    // Return release with tasks
    const full = await pool.query(
      `SELECT
         r.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id', n.id,
               'content', n.content,
               'completed_at', n.completed_at,
               'created_at', n.created_at
             ) ORDER BY n.completed_at
           ) FILTER (WHERE n.id IS NOT NULL),
           '[]'
         ) AS tasks
       FROM releases r
       LEFT JOIN release_tasks rt ON rt.release_id = r.id
       LEFT JOIN notes n ON n.id = rt.note_id
       WHERE r.id = $1
       GROUP BY r.id`,
      [release.id]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/releases/:id (top-level, mounted separately)
const deleteRouter = express.Router();
deleteRouter.use(auth);
deleteRouter.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM releases WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Release not found' });
    res.json({ message: 'Release deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { releasesRouter: router, releaseDeleteRouter: deleteRouter };
