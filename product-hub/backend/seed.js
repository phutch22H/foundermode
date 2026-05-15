require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initDB } = require('./db');

async function seed() {
  await initDB();

  const email = 'demo@example.com';
  const password = 'password123';
  const hash = await bcrypt.hash(password, 12);

  // Upsert demo user
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2
     RETURNING id`,
    [email, hash]
  );
  const userId = userResult.rows[0].id;
  console.log(`Demo user: ${email} / ${password}`);

  // Clear existing products for demo user
  await pool.query('DELETE FROM products WHERE user_id = $1', [userId]);

  const products = [
    {
      name: 'Product Hub',
      description: 'A portfolio tracking app for builders. Manages products, notes, and AI insights.',
      status: 'in-progress',
      stage: 'mvp',
      mrr: 0,
      active_users: 1,
    },
    {
      name: 'SaaS Boilerplate',
      description: 'Reusable auth + payments starter kit. Saves weeks of setup on new projects.',
      status: 'shipped',
      stage: 'stable',
      mrr: 1200,
      active_users: 48,
    },
    {
      name: 'AI Writing Tool',
      description: 'Long-form content assistant with brand voice tuning and SEO suggestions.',
      status: 'planning',
      stage: 'validation',
      mrr: 0,
      active_users: 0,
    },
    {
      name: 'Analytics Dashboard',
      description: 'Unified metrics from Stripe, Mixpanel, and Google Analytics in one place.',
      status: 'paused',
      stage: 'mvp',
      mrr: 320,
      active_users: 12,
    },
  ];

  for (const p of products) {
    const res = await pool.query(
      `INSERT INTO products (user_id, name, description, status, stage, mrr, active_users)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, p.name, p.description, p.status, p.stage, p.mrr, p.active_users]
    );
    const productId = res.rows[0].id;

    // Add a sample note per product
    await pool.query(
      'INSERT INTO notes (product_id, user_id, content, tags) VALUES ($1, $2, $3, $4)',
      [productId, userId, `Initial setup and research for ${p.name}.`, ['kickoff']]
    );
  }

  console.log(`Seeded ${products.length} products with notes.`);
  await pool.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
