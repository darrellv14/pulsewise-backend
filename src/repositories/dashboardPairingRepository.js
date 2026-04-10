const { pool } = require('../config/database');

const PAIRING_SESSION_FIELDS = `
  pairing_session_id,
  doctor_id,
  status,
  expires_at,
  confirmed_at,
  confirmed_by_patient_id,
  created_at,
  updated_at
`;

async function createDashboardPairingSession({ doctorId, pairingTokenHash, expiresAt }) {
  const query = `
    INSERT INTO dashboard_pairing_sessions (
      doctor_id,
      pairing_token_hash,
      status,
      expires_at
    ) VALUES ($1, $2, 'pending', $3)
    RETURNING ${PAIRING_SESSION_FIELDS}
  `;

  const result = await pool.query(query, [doctorId, pairingTokenHash, expiresAt]);
  return result.rows[0] || null;
}

async function findDashboardPairingSessionById({ doctorId, pairingSessionId }) {
  const query = `
    SELECT ${PAIRING_SESSION_FIELDS}
    FROM dashboard_pairing_sessions
    WHERE doctor_id = $1
      AND pairing_session_id = $2
    LIMIT 1
  `;

  const result = await pool.query(query, [doctorId, pairingSessionId]);
  return result.rows[0] || null;
}

async function findDashboardPairingSessionByTokenHash(pairingTokenHash) {
  const query = `
    SELECT ${PAIRING_SESSION_FIELDS}
    FROM dashboard_pairing_sessions
    WHERE pairing_token_hash = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [pairingTokenHash]);
  return result.rows[0] || null;
}

async function findActiveDashboardPairingSessionByTokenHash(pairingTokenHash) {
  const query = `
    SELECT ${PAIRING_SESSION_FIELDS}
    FROM dashboard_pairing_sessions
    WHERE pairing_token_hash = $1
      AND status = 'pending'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [pairingTokenHash]);
  return result.rows[0] || null;
}

async function confirmDashboardPairingSessionAtomic({ pairingTokenHash, patientId, source }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const confirmResult = await client.query(
      `
        UPDATE dashboard_pairing_sessions
        SET
          status = 'confirmed',
          confirmed_at = NOW(),
          confirmed_by_patient_id = $2,
          updated_at = NOW()
        WHERE pairing_token_hash = $1
          AND status = 'pending'
          AND expires_at > NOW()
        RETURNING ${PAIRING_SESSION_FIELDS}
      `,
      [pairingTokenHash, patientId]
    );

    if (confirmResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const pairingSession = confirmResult.rows[0];
    const linkResult = await client.query(
      `
        INSERT INTO doctor_patients (
          doctor_id,
          patient_id,
          source,
          is_active
        ) VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (doctor_id, patient_id)
        DO UPDATE SET
          source = EXCLUDED.source,
          linked_at = NOW(),
          is_active = TRUE
        RETURNING doctor_id, patient_id, source, linked_at, is_active
      `,
      [pairingSession.doctor_id, patientId, source]
    );

    await client.query('COMMIT');

    return {
      pairingSession,
      doctorPatientLink: linkResult.rows[0] || null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function markDashboardPairingSessionConfirmed({ pairingSessionId, patientId }) {
  const query = `
    UPDATE dashboard_pairing_sessions
    SET
      status = 'confirmed',
      confirmed_at = NOW(),
      confirmed_by_patient_id = $2,
      updated_at = NOW()
    WHERE pairing_session_id = $1
      AND status = 'pending'
      AND expires_at > NOW()
    RETURNING ${PAIRING_SESSION_FIELDS}
  `;

  const result = await pool.query(query, [pairingSessionId, patientId]);
  return result.rows[0] || null;
}

async function markDashboardPairingSessionExpired(pairingSessionId) {
  const query = `
    UPDATE dashboard_pairing_sessions
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE pairing_session_id = $1
      AND status = 'pending'
    RETURNING ${PAIRING_SESSION_FIELDS}
  `;

  const result = await pool.query(query, [pairingSessionId]);
  return result.rows[0] || null;
}

module.exports = {
  createDashboardPairingSession,
  findDashboardPairingSessionById,
  findDashboardPairingSessionByTokenHash,
  findActiveDashboardPairingSessionByTokenHash,
  confirmDashboardPairingSessionAtomic,
  markDashboardPairingSessionConfirmed,
  markDashboardPairingSessionExpired,
};
