require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const migrationDir = path.join(__dirname, '..', 'db', 'migrations');

function getPool() {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'pulsewise',
    user: process.env.POSTGRES_USER || 'pulsewise',
    password: process.env.POSTGRES_PASSWORD || 'pulsewise123',
  });
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function run() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureMigrationsTable(client);
    await client.query('COMMIT');

    const files = fs
      .readdirSync(migrationDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const fileName of files) {
      const alreadyRun = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [fileName]);

      if (alreadyRun.rowCount > 0) {
        console.log(`[migrate] skip ${fileName}`);
        continue;
      }

      const filePath = path.join(migrationDir, fileName);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [fileName]);
        await client.query('COMMIT');
        console.log(`[migrate] applied ${fileName}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('[migrate] done');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('[migrate] failed', error.message);
  process.exit(1);
});
