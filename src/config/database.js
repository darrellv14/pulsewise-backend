const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.postgres.host,
  port: env.postgres.port,
  database: env.postgres.database,
  user: env.postgres.user,
  password: env.postgres.password,
  max: 10,
  idleTimeoutMillis: 30000,
});

async function healthCheck() {
  const result = await pool.query('SELECT NOW() AS db_time');
  return result.rows[0];
}

module.exports = {
  pool,
  healthCheck,
};
