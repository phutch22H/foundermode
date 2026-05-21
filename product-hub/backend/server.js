require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB, pool } = require('./db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const { notesRouter, noteDeleteRouter } = require('./routes/notes');
const { releasesRouter, releaseDeleteRouter } = require('./routes/releases');
const insightRoutes = require('./routes/insights');
const digestRoutes = require('./routes/digest');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL, /\.railway\.app$/]
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Product routes
app.use('/api/products', productRoutes);

// Notes routes (nested under products)
app.use('/api/products/:productId/notes', notesRouter);

// Note delete/patch (top-level)
app.use('/api/notes', noteDeleteRouter);

// Releases routes
app.use('/api/products/:productId/releases', releasesRouter);
app.use('/api/releases', releaseDeleteRouter);

// Insights routes
app.use('/api/insights', insightRoutes);

// Digest routes
app.use('/api/digest', digestRoutes);

// Dashboard summary
app.get('/api/dashboard/summary', auth, async (req, res) => {
  try {
    const [productsResult, mrrResult, statusResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, SUM(active_users) as total_users FROM products WHERE user_id = $1', [req.userId]),
      pool.query('SELECT COALESCE(SUM(mrr), 0) as total_mrr FROM products WHERE user_id = $1', [req.userId]),
      pool.query(
        `SELECT status, COUNT(*) as count FROM products WHERE user_id = $1 GROUP BY status`,
        [req.userId]
      ),
    ]);

    const statusBreakdown = {};
    for (const row of statusResult.rows) {
      statusBreakdown[row.status] = parseInt(row.count);
    }

    res.json({
      totalProducts: parseInt(productsResult.rows[0].total),
      totalUsers: parseInt(productsResult.rows[0].total_users) || 0,
      totalMrr: parseFloat(mrrResult.rows[0].total_mrr),
      statusBreakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Summarize a Claude Code session transcript → structured summary
app.post('/api/activity/summarize', auth, async (req, res) => {
  const { transcript = [], productId } = req.body;
  if (!transcript.length) return res.status(400).json({ error: 'transcript required' });

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Flatten transcript to readable text
    const readable = transcript.map(turn => {
      const role = turn.role === 'user' ? 'User' : 'Claude';
      let content = '';
      if (typeof turn.content === 'string') {
        content = turn.content;
      } else if (Array.isArray(turn.content)) {
        content = turn.content
          .map(b => {
            if (b.type === 'text') return b.text;
            if (b.type === 'tool_use') return `[${b.name}]`;
            return '';
          })
          .filter(Boolean)
          .join(' ');
      }
      return `${role}: ${content}`;
    }).join('\n');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'You are a technical writer summarizing a software development session. Be concise and specific. Return only valid JSON.',
      messages: [{
        role: 'user',
        content: `Summarize this Claude Code session in JSON with these exact keys:
- "task": one sentence describing the primary goal (max 120 chars)
- "built": array of specific things created or changed (max 5 items, each max 80 chars)
- "decisions": array of key technical/product decisions made (max 3 items)
- "currentState": one sentence on where the project stands now (max 120 chars)

Session transcript:
${readable.slice(0, 8000)}`,
      }],
    });

    let summary;
    try {
      const raw = message.content[0].text;
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
      summary = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(502).json({ error: 'Failed to parse summary' });
    }

    res.json(summary);
  } catch (err) {
    console.error('Summarize error:', err);
    res.status(502).json({ error: 'Summarization failed' });
  }
});

// Cross-product activity feed (claude-code sessions)
app.get('/api/activity', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const result = await pool.query(
      `SELECT n.*, p.name AS product_name, p.id AS product_id
       FROM notes n
       JOIN products p ON p.id = n.product_id
       WHERE n.user_id = $1 AND n.source = 'claude-code'
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [req.userId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Integration scaffolds (for later)
app.get('/api/integrations/google-drive/auth', auth, (req, res) => {
  res.json({ message: 'Google Drive integration coming soon' });
});
app.post('/api/integrations/slack/notify', auth, (req, res) => {
  res.json({ message: 'Slack integration coming soon' });
});

// Export CSV
app.get('/api/export/csv', auth, async (req, res) => {
  try {
    const products = await pool.query(
      'SELECT name, status, stage, mrr, active_users, created_at FROM products WHERE user_id = $1 ORDER BY name',
      [req.userId]
    );
    const headers = ['Name', 'Status', 'Stage', 'MRR', 'Active Users', 'Created At'];
    const rows = products.rows.map(p =>
      [p.name, p.status, p.stage, p.mrr, p.active_users, p.created_at].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../frontend/dist');
  const basePath = process.env.VITE_BASE_PATH || '';
  if (basePath) {
    app.use(basePath, express.static(distDir));
    app.get(`${basePath}/*`, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// Start server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
