const { pool } = require('../config/database');

async function findUserByEmail(email) {
  const query = `
    SELECT
      u.user_id,
      u.username,
      u.email,
      u.password_hash,
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
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertUserQuery = `
      INSERT INTO users (
        username,
        email,
        password_hash,
        first_name,
        last_name
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, username, email, first_name, last_name
    `;

    const userResult = await client.query(insertUserQuery, [
      username,
      email,
      passwordHash,
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

module.exports = {
  findUserByEmail,
  findUserById,
  createUserWithRole,
};
