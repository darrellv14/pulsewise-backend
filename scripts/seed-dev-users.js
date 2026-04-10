require('dotenv').config();
const { Pool } = require('pg');

function getPool() {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'pulsewise',
    user: process.env.POSTGRES_USER || 'pulsewise',
    password: process.env.POSTGRES_PASSWORD || 'pulsewise123',
  });
}

async function seedUser(client, { username, email, role, firstName, lastName, passwordHash }) {
  const userQuery = `
    INSERT INTO users (
      username,
      email,
      password_hash,
      first_name,
      last_name,
      is_active,
      account_status,
      email_verified_at
    ) VALUES ($1, $2, $3, $4, $5, TRUE, 'active', NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      is_active = TRUE,
      account_status = 'active',
      email_verified_at = COALESCE(users.email_verified_at, NOW())
    RETURNING user_id
  `;

  const userResult = await client.query(userQuery, [
    username,
    email,
    passwordHash,
    firstName,
    lastName,
  ]);

  const roleResult = await client.query('SELECT role_id FROM roles WHERE code = $1 LIMIT 1', [
    role,
  ]);
  if (roleResult.rowCount === 0) {
    throw new Error(`Role ${role} tidak ditemukan`);
  }

  await client.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [userResult.rows[0].user_id, roleResult.rows[0].role_id]
  );
}

async function run() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const commonHash = '$2b$10$QmRzecCBEih5sWBrnYtLYevTkqgUQJzaqnO.f32e1sfU87Xd8Ha7q'; // dev12345

    await seedUser(client, {
      username: 'devpatient',
      email: 'dev@pulsewise.local',
      role: 'patient',
      firstName: 'Dev',
      lastName: 'Patient',
      passwordHash: commonHash,
    });

    await seedUser(client, {
      username: 'devdoctor',
      email: 'doctor@pulsewise.local',
      role: 'doctor',
      firstName: 'Dev',
      lastName: 'Doctor',
      passwordHash: commonHash,
    });

    await client.query('COMMIT');
    console.log('[seed:dev] done');
    console.log('[seed:dev] patient: dev@pulsewise.local / dev12345');
    console.log('[seed:dev] doctor: doctor@pulsewise.local / dev12345');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seed:dev] failed', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
