require('dotenv').config({ override: true });

const {
  DEFAULT_PASSWORD_HASH,
  getPool,
  ensureRoleId,
  ensureDoctorProfile,
} = require('./seed-dashboard-data');

const INTERNAL_ADMINS = [
  {
    email: 'darrell.valentino14@gmail.com',
    deleteFirst: true,
    defaultUsername: 'darrellvalentino14',
    defaultFirstName: 'Darrell',
    defaultLastName: 'Valentino',
    defaultRoles: ['patient', 'admin'],
  },
  {
    email: 'fransnicklaus101004@gmail.com',
    deleteFirst: false,
    defaultUsername: 'fransnicklaus101004',
    defaultFirstName: 'Frans',
    defaultLastName: 'Nicklaus',
    defaultRoles: ['patient', 'admin'],
  },
];

function sanitizeUsername(email, fallbackUsername) {
  const normalized = String(email || '')
    .split('@')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 100);

  return normalized || fallbackUsername;
}

async function getUserSnapshot(client, email) {
  const result = await client.query(
    `
      SELECT
        u.user_id,
        u.username,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.avatar_photo,
        u.google_sub,
        u.address,
        u.tel_no,
        u.onboarding_completed,
        u.account_status,
        u.email_verified_at,
        COALESCE(
          ARRAY_AGG(r.code ORDER BY
            CASE r.code
              WHEN 'admin' THEN 1
              WHEN 'doctor' THEN 2
              WHEN 'patient' THEN 3
              ELSE 99
            END
          ) FILTER (WHERE r.code IS NOT NULL),
          ARRAY[]::text[]
        ) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.user_id
      LEFT JOIN roles r ON r.role_id = ur.role_id
      WHERE u.email = $1
      GROUP BY u.user_id
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
}

async function deleteUserByEmail(client, email) {
  await client.query('DELETE FROM users WHERE email = $1', [email]);
}

async function upsertInternalUser(client, config, snapshot) {
  const roles = Array.from(new Set([...(snapshot?.roles || config.defaultRoles), 'admin']));
  const userResult = await client.query(
    `
      INSERT INTO users (
        username,
        email,
        password_hash,
        first_name,
        last_name,
        avatar_photo,
        google_sub,
        address,
        tel_no,
        is_active,
        onboarding_completed,
        account_status,
        email_verified_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, 'active', COALESCE($11, NOW())
      )
      ON CONFLICT (email)
      DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        avatar_photo = EXCLUDED.avatar_photo,
        google_sub = EXCLUDED.google_sub,
        address = EXCLUDED.address,
        tel_no = EXCLUDED.tel_no,
        is_active = TRUE,
        onboarding_completed = EXCLUDED.onboarding_completed,
        account_status = 'active',
        email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at, NOW()),
        updated_at = NOW()
      RETURNING user_id
    `,
    [
      snapshot?.username || sanitizeUsername(config.email, config.defaultUsername),
      config.email,
      snapshot?.password_hash || DEFAULT_PASSWORD_HASH,
      snapshot?.first_name || config.defaultFirstName,
      snapshot?.last_name || config.defaultLastName,
      snapshot?.avatar_photo || null,
      snapshot?.google_sub || null,
      snapshot?.address || null,
      snapshot?.tel_no || null,
      snapshot?.onboarding_completed !== false,
      snapshot?.email_verified_at || null,
    ]
  );

  return {
    userId: userResult.rows[0].user_id,
    roles,
    usedDefaultPassword: !snapshot?.password_hash,
  };
}

async function ensureUserRoles(client, userId, roles) {
  for (const roleCode of roles) {
    const roleId = await ensureRoleId(client, roleCode);
    await client.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userId, roleId]
    );
  }
}

async function ensureAdminUser(client, config) {
  const snapshot = await getUserSnapshot(client, config.email);

  if (config.deleteFirst && snapshot) {
    await deleteUserByEmail(client, config.email);
  }

  const user = await upsertInternalUser(client, config, snapshot);
  await ensureUserRoles(client, user.userId, user.roles);

  if (user.roles.includes('doctor')) {
    await ensureDoctorProfile(client, user.userId);
  }

  return {
    email: config.email,
    userId: user.userId,
    roles: user.roles,
    reseeded: Boolean(config.deleteFirst),
    usedDefaultPassword: user.usedDefaultPassword,
  };
}

async function run() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const results = [];
    for (const config of INTERNAL_ADMINS) {
      results.push(await ensureAdminUser(client, config));
    }

    await client.query('COMMIT');

    console.log('[seed:admins] done');
    for (const result of results) {
      console.log(
        `[seed:admins] ${result.email} roles=${result.roles.join(',')} userId=${result.userId}`
      );
      if (result.usedDefaultPassword) {
        console.log(
          `[seed:admins] ${result.email} memakai password default seed: dev12345`
        );
      }
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seed:admins] failed', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
