const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// POST /api/insights/generate
router.post('/generate', async (req, res) => {
  try {
    // Fetch all products + recent notes for this user
    const products = await pool.query(
      'SELECT * FROM products WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.userId]
    );
    const notes = await pool.query(
      `SELECT n.*, p.name as product_name
       FROM notes n JOIN products p ON n.product_id = p.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC LIMIT 50`,
      [req.userId]
    );

    const portfolioData = {
      products: products.rows,
      recentNotes: notes.rows,
    };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      system: `You are a product strategy advisor. Analyze this portfolio and provide actionable insights about feature synergies, validation gaps, and revenue opportunities. Be specific and practical. Format your response as JSON with these keys: summary (string), opportunities (array of strings), validationGaps (array of strings), financialTrends (string), nextActions (array of strings).`,
      messages: [
        {
          role: 'user',
          content: `Here is my product portfolio data:\n\n${JSON.stringify(portfolioData, null, 2)}\n\nPlease analyze and provide insights.`,
        },
      ],
    });

    let insightContent = message.content[0].text;

    // Try to extract JSON if wrapped in markdown code block
    const jsonMatch = insightContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) insightContent = jsonMatch[1].trim();

    // Store insight in DB
    const result = await pool.query(
      'INSERT INTO insights (user_id, insight_type, content) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, 'weekly_summary', insightContent]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Insights generation error:', err);
    // Return a graceful fallback if Claude call fails
    if (err.name === 'APIError' || err.status) {
      return res.status(502).json({ error: 'AI service unavailable. Please try again later.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/insights
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/insights/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM insights WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Insight not found' });
    res.json({ message: 'Insight deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
