require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const migrationDir = path.join(__dirname, '..', 'db', 'migrations');

function parseConnectionString(connectionString) {
  if (!connectionString) {
    return null;
  }

  try {
    const parsed = new URL(connectionString);
    return {
      host: parsed.hostname || undefined,
      port: parsed.port ? Number(parsed.port) : undefined,
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      ssl:
        parsed.searchParams.get('sslmode') === 'require'
          ? {
              rejectUnauthorized: false,
            }
          : undefined,
    };
  } catch (_error) {
    return null;
  }
}

function getPool() {
  const directConnectionString =
    process.env.DIRECT_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  const parsedDirect = parseConnectionString(directConnectionString);

  if (parsedDirect?.host) {
    return new Pool({
      host: parsedDirect.host,
      port: parsedDirect.port || 5432,
      database: parsedDirect.database || 'postgres',
      user: parsedDirect.user,
      password: parsedDirect.password,
      ssl: parsedDirect.ssl,
    });
  }

  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'pulsewise',
    user: process.env.POSTGRES_USER || 'pulsewise',
    password: process.env.POSTGRES_PASSWORD || 'pulsewise123',
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
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
      const alreadyRun = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [
        fileName,
      ]);

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
