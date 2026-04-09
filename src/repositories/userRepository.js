const { pool } = require('../config/database');

async function findUserByEmail(email) {
  const query = `
    SELECT
      u.user_id,
      u.username,
      u.email,
      u.password_hash,
      u.account_status,
      u.email_verified_at,
      u.first_name,
      u.last_name,
      r.code AS role
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.user_id
    LEFT JOIN roles r ON r.role_id = ur.role_id
    WHERE u.email = $1 AND u.is_active = TRUE
    LIMIT 1
  `;

  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

async function findUserById(userId) {
  const query = `
    SELECT
      u.user_id,
      u.username,
      u.email,
      u.account_status,
      u.email_verified_at,
      u.first_name,
      u.last_name,
      r.code AS role
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.user_id
    LEFT JOIN roles r ON r.role_id = ur.role_id
    WHERE u.user_id = $1 AND u.is_active = TRUE
    LIMIT 1
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
}

async function createUserWithRole({
  username,
  email,
  passwordHash,
  firstName,
  lastName,
  role,
  accountStatus = 'pending_verification',
  emailVerifiedAt = null,
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertUserQuery = `
      INSERT INTO users (
        username,
        email,
        password_hash,
        account_status,
        email_verified_at,
        first_name,
        last_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING user_id, username, email, account_status, email_verified_at, first_name, last_name
    `;

    const userResult = await client.query(insertUserQuery, [
      username,
      email,
      passwordHash,
      accountStatus,
      emailVerifiedAt,
      firstName,
      lastName,
    ]);

    const roleResult = await client.query(
      'SELECT role_id, code FROM roles WHERE code = $1 LIMIT 1',
      [role]
    );

    if (roleResult.rowCount === 0) {
      const error = new Error('Role tidak ditemukan pada master roles');
      error.statusCode = 500;
      throw error;
    }

    await client.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
      [userResult.rows[0].user_id, roleResult.rows[0].role_id]
    );

    await client.query('COMMIT');

    return {
      ...userResult.rows[0],
      role: roleResult.rows[0].code,
    };
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      const conflict = new Error('Username atau email sudah terdaftar');
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function createEmailVerification({ userId, email, otpCodeHash, expiresAt }) {
  const query = `
    INSERT INTO email_verifications (
      user_id,
      email,
      otp_code_hash,
      expires_at
    ) VALUES ($1, $2, $3, $4)
    RETURNING verification_id, expires_at, created_at
  `;

  const result = await pool.query(query, [userId, email, otpCodeHash, expiresAt]);
  return result.rows[0] || null;
}

async function findLatestValidEmailVerification(email) {
  const query = `
    SELECT
      verification_id,
      user_id,
      email,
      otp_code_hash,
      expires_at,
      consumed_at,
      created_at
    FROM email_verifications
    WHERE email = $1
      AND consumed_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

async function consumeEmailVerification(verificationId) {
  await pool.query(
    'UPDATE email_verifications SET consumed_at = NOW() WHERE verification_id = $1',
    [verificationId]
  );
}

async function activateUserByEmail(email) {
  const query = `
    UPDATE users
    SET
      account_status = 'active',
      email_verified_at = COALESCE(email_verified_at, NOW()),
      updated_at = NOW()
    WHERE email = $1
    RETURNING user_id, username, email, account_status, email_verified_at, first_name, last_name
  `;

  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

async function createOrGetGoogleUser({ email, firstName, lastName, role, passwordHash }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.account_status !== 'active') {
      await activateUserByEmail(email);
    }

    return await findUserByEmail(email);
  }

  const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32) || 'googleuser';
  const username = `${usernameBase}_${Date.now().toString().slice(-6)}`;
  return createUserWithRole({
    username,
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    accountStatus: 'active',
    emailVerifiedAt: new Date().toISOString(),
  });
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUserWithRole,
  createEmailVerification,
  findLatestValidEmailVerification,
  consumeEmailVerification,
  activateUserByEmail,
  createOrGetGoogleUser,
};
