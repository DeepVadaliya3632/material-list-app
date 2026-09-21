const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || '';
const needsSsl =
  process.env.NODE_ENV === 'production' || dbUrl.includes('sslmode=require');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

/**
 * Run the auto-migration to create the materials table if it doesn't exist.
 */
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS materials (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      company     TEXT NOT NULL,
      supplier    TEXT NOT NULL DEFAULT '',
      price       NUMERIC(12,2) NOT NULL CHECK (price >= 0),
      quantity    INTEGER CHECK (quantity >= 0),
      unit        TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  /* Add columns for existing tables */
  await pool.query(`
    ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplier TEXT NOT NULL DEFAULT '';
  `);
  await pool.query(`
    ALTER TABLE materials ADD COLUMN IF NOT EXISTS quantity INTEGER CHECK (quantity >= 0);
  `);

  /* Drop the old supply column if it still exists */
  await pool.query(`
    ALTER TABLE materials DROP COLUMN IF EXISTS supply;
  `);
}

module.exports = { pool, migrate };
