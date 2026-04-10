const { Pool } = require('pg');
const env = require('./env');

function normalizeConnectionString(connectionString) {
  if (!connectionString) {
    return connectionString;
  }

  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get('sslmode');

    if (sslMode === 'require' && !parsed.searchParams.has('uselibpqcompat')) {
      parsed.searchParams.set('uselibpqcompat', 'true');
    }

    return parsed.toString();
  } catch (_error) {
    return connectionString;
  }
}

const sslConfig = env.postgres.ssl
  ? {
      rejectUnauthorized: env.postgres.sslRejectUnauthorized,
    }
  : undefined;

const normalizedDatabaseUrl = normalizeConnectionString(env.databaseUrl);

const poolConfig = env.databaseUrl
  ? {
      connectionString: normalizedDatabaseUrl,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
    }
  : {
      host: env.postgres.host,
      port: env.postgres.port,
      database: env.postgres.database,
      user: env.postgres.user,
      password: env.postgres.password,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
    };

const pool = new Pool(poolConfig);

async function healthCheck() {
  const result = await pool.query('SELECT NOW() AS db_time');
  return result.rows[0];
}

module.exports = {
  pool,
  healthCheck,
};
