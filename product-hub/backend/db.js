const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) CHECK (status IN ('planning', 'in-progress', 'shipped', 'paused')) DEFAULT 'planning',
        stage VARCHAR(50) CHECK (stage IN ('idea', 'validation', 'mvp', 'growth', 'stable')) DEFAULT 'idea',
        mrr DECIMAL(10, 2) DEFAULT 0,
        active_users INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        insight_type VARCHAR(50),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate notes table
    await client.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);
    await client.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'`);

    // Migrate products table
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS context_doc TEXT`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS releases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS release_tasks (
        release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
        note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        PRIMARY KEY (release_id, note_id)
      )
    `);

    // Migrate releases table
    await client.query(`ALTER TABLE releases ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'web'`);
    await client.query(`ALTER TABLE releases ADD COLUMN IF NOT EXISTS build_number VARCHAR(50)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS digests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        period_from DATE NOT NULL,
        period_to DATE NOT NULL,
        content JSONB NOT NULL,
        narrative TEXT NOT NULL,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_digests_user ON digests(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_releases_product ON releases(product_id)`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notes_product ON notes(product_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id)`);

    console.log('Database initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
