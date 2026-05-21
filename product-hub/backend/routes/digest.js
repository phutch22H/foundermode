const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// --- Helpers ---

async function generateDigestData(userId) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);

  // All claude-code activity in the past 7 days
  const activityResult = await pool.query(
    `SELECT n.content, n.created_at, p.id AS product_id, p.name AS product_name
     FROM notes n
     JOIN products p ON p.id = n.product_id
     WHERE n.user_id = $1 AND n.source = 'claude-code' AND n.created_at >= $2
     ORDER BY n.created_at DESC`,
    [userId, from]
  );

  // Releases in the past 7 days
  const releasesResult = await pool.query(
    `SELECT r.name, r.type, r.build_number, r.released_at, p.name AS product_name, p.id AS product_id
     FROM releases r
     JOIN products p ON p.id = r.product_id
     WHERE r.user_id = $1 AND r.released_at >= $2
     ORDER BY r.released_at DESC`,
    [userId, from]
  );

  // All products (to detect stagnant ones)
  const allProducts = await pool.query(
    `SELECT p.id, p.name, p.status,
       MAX(n.created_at) AS last_activity
     FROM products p
     LEFT JOIN notes n ON n.product_id = p.id AND n.source = 'claude-code'
     WHERE p.user_id = $1
     GROUP BY p.id, p.name, p.status`,
    [userId]
  );

  // Group activity by product
  const byProduct = new Map();
  for (const row of activityResult.rows) {
    if (!byProduct.has(row.product_id)) {
      byProduct.set(row.product_id, { id: row.product_id, name: row.product_name, sessions: [] });
    }
    byProduct.get(row.product_id).sessions.push(row);
  }

  // Parse session content into structured parts
  function parseParts(content) {
    const parts = {};
    content.split(' | ').forEach(seg => {
      const colon = seg.indexOf(': ');
      if (colon !== -1) parts[seg.slice(0, colon).trim()] = seg.slice(colon + 2).trim();
    });
    return parts;
  }

  const activeProducts = Array.from(byProduct.values()).map(p => {
    const built = [];
    const decisions = [];
    p.sessions.forEach(s => {
      const parts = parseParts(s.content);
      if (parts['Built']) built.push(...parts['Built'].split(' · '));
      if (parts['Decisions']) decisions.push(...parts['Decisions'].split(' · '));
    });
    const releases = releasesResult.rows.filter(r => r.product_id === p.id);
    return { id: p.id, name: p.name, sessionCount: p.sessions.length, built, decisions, releases };
  });

  const stagnant = allProducts.rows
    .filter(p => {
      const hasRecentActivity = byProduct.has(p.id);
      if (hasRecentActivity) return false;
      const lastActivity = p.last_activity ? new Date(p.last_activity) : null;
      const daysSince = lastActivity ? Math.floor((now - lastActivity) / 86400000) : null;
      return daysSince === null || daysSince > 7;
    })
    .map(p => {
      const lastActivity = p.last_activity ? new Date(p.last_activity) : null;
      const daysSince = lastActivity ? Math.floor((now - lastActivity) / 86400000) : null;
      return { id: p.id, name: p.name, daysSince };
    });

  return {
    period: { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
    totalSessions: activityResult.rows.length,
    activeProducts,
    stagnant,
    releases: releasesResult.rows,
  };
}

async function generateNarrative(data) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const productSummaries = data.activeProducts.map(p => {
    const lines = [`${p.name} (${p.sessionCount} session${p.sessionCount !== 1 ? 's' : ''})`];
    if (p.built.length) lines.push(`Built: ${p.built.slice(0, 6).join(', ')}`);
    if (p.decisions.length) lines.push(`Decisions: ${p.decisions.slice(0, 3).join(', ')}`);
    if (p.releases.length) lines.push(`Released: ${p.releases.map(r => `${r.name}${r.build_number ? ` #${r.build_number}` : ''}`).join(', ')}`);
    return lines.join('\n');
  }).join('\n\n');

  const stagnantText = data.stagnant.length
    ? `No activity: ${data.stagnant.map(p => `${p.name}${p.daysSince ? ` (${p.daysSince} days)` : ''}`).join(', ')}`
    : '';

  const prompt = `You are writing a weekly digest for a founder/CEO. Be direct, specific, and brief. Write 3-5 sentences max. Focus on momentum, what actually shipped, and anything that needs attention. Do not use bullet points — write in flowing prose. Sound like a sharp COO briefing, not a status report.

Last 7 days across the portfolio:

${productSummaries}
${stagnantText}

Write the narrative now:`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text.trim();
}

function buildEmailHtml(narrative, data, userEmail) {
  const { period, activeProducts, stagnant, releases } = data;

  const productRows = activeProducts.map(p => {
    const releaseStr = p.releases.length
      ? p.releases.map(r => `<span style="background:#1a3a1a;color:#4ade80;padding:1px 6px;border-radius:9999px;font-size:11px;margin-left:6px;">${r.name}${r.build_number ? ` #${r.build_number}` : ''}</span>`).join('')
      : '';
    const builtList = p.built.slice(0, 5).map(b => `<li style="margin:2px 0;color:#a3a3a3;">${b}</li>`).join('');
    return `
      <div style="padding:16px 0;border-bottom:1px solid #262626;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-weight:600;color:#f5f5f5;">${p.name}</span>
          <span style="color:#525252;font-size:12px;">${p.sessionCount} session${p.sessionCount !== 1 ? 's' : ''}</span>
          ${releaseStr}
        </div>
        ${builtList ? `<ul style="margin:0;padding-left:16px;font-size:13px;">${builtList}</ul>` : ''}
      </div>`;
  }).join('');

  const stagnantStr = stagnant.length
    ? `<div style="margin-top:24px;padding:12px 16px;background:#1c1008;border:1px solid #3a2a08;border-radius:8px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#a16207;text-transform:uppercase;letter-spacing:.05em;">No activity</p>
        <p style="margin:0;font-size:13px;color:#78716c;">${stagnant.map(p => `${p.name}${p.daysSince ? ` — ${p.daysSince} days` : ''}`).join(' · ')}</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#525252;text-transform:uppercase;letter-spacing:.1em;">Founder Mode</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#f5f5f5;">Weekly Digest</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#525252;">${period.from} — ${period.to}</p>
    </div>

    <div style="background:#141414;border:1px solid #262626;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:#d4d4d4;">${narrative}</p>
    </div>

    <div style="margin-bottom:8px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#525252;text-transform:uppercase;letter-spacing:.05em;">This week</p>
      ${productRows || '<p style="color:#525252;font-size:13px;">No activity this week.</p>'}
    </div>

    ${stagnantStr}

    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1a1a1a;">
      <p style="margin:0;font-size:11px;color:#404040;">Sent to ${userEmail} · <a href="#" style="color:#404040;">Unsubscribe</a></p>
    </div>

  </div>
</body>
</html>`;
}

// --- Routes ---

// POST /api/digest/generate — generate + save
router.post('/generate', async (req, res) => {
  try {
    const data = await generateDigestData(req.userId);
    const narrative = await generateNarrative(data);

    const result = await pool.query(
      `INSERT INTO digests (user_id, period_from, period_to, content, narrative)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, data.period.from, data.period.to, JSON.stringify(data), narrative]
    );

    res.json({ ...result.rows[0], data, narrative });
  } catch (err) {
    console.error('Digest generate error:', err);
    res.status(502).json({ error: err.message || 'Failed to generate digest' });
  }
});

// GET /api/digest — list past digests
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, period_from, period_to, narrative, sent_at, created_at
       FROM digests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 12`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/digest/:id — get full digest
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM digests WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    const row = result.rows[0];
    res.json({ ...row, data: row.content });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/digest/:id/send — send via email
router.post('/:id/send', async (req, res) => {
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'RESEND_API_KEY not configured' });

  try {
    const digestResult = await pool.query(
      'SELECT * FROM digests WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!digestResult.rows[0]) return res.status(404).json({ error: 'Not found' });

    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.userId]);
    const userEmail = userResult.rows[0]?.email;

    const digest = digestResult.rows[0];
    const data = digest.content;
    const html = buildEmailHtml(digest.narrative, data, userEmail);

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Founder Mode <digest@foundermode.so>',
      to: userEmail,
      subject: `Weekly digest — ${data.period?.from || digest.period_from}`,
      html,
    });

    await pool.query('UPDATE digests SET sent_at = NOW() WHERE id = $1', [digest.id]);

    res.json({ message: 'Digest sent' });
  } catch (err) {
    console.error('Send error:', err);
    res.status(502).json({ error: err.message || 'Failed to send' });
  }
});

// POST /api/digest/cron — weekly cron trigger (Railway)
router.post('/cron', async (req, res) => {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const users = await pool.query('SELECT id, email FROM users');
    const results = [];

    for (const user of users.rows) {
      try {
        const data = await generateDigestData(user.id);
        if (data.totalSessions === 0) continue; // skip users with no activity

        const narrative = await generateNarrative(data);
        const digestResult = await pool.query(
          `INSERT INTO digests (user_id, period_from, period_to, content, narrative)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [user.id, data.period.from, data.period.to, JSON.stringify(data), narrative]
        );

        if (process.env.RESEND_API_KEY) {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          const html = buildEmailHtml(narrative, data, user.email);
          await resend.emails.send({
            from: 'Founder Mode <digest@foundermode.so>',
            to: user.email,
            subject: `Weekly digest — ${data.period.from}`,
            html,
          });
          await pool.query('UPDATE digests SET sent_at = NOW() WHERE id = $1', [digestResult.rows[0].id]);
        }

        results.push({ email: user.email, status: 'sent' });
      } catch (err) {
        results.push({ email: user.email, status: 'failed', error: err.message });
      }
    }

    res.json({ processed: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
