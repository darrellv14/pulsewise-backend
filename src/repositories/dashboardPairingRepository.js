const { pool } = require('../config/database');

async function createDashboardPairingSession({ doctorId, pairingTokenHash, expiresAt }) {
  const query = `
    INSERT INTO dashboard_pairing_sessions (
      doctor_id,
      pairing_token_hash,
      status,
      expires_at
    ) VALUES ($1, $2, 'pending', $3)
    RETURNING
      pairing_session_id,
      doctor_id,
      status,
      expires_at,
      confirmed_at,
      confirmed_by_patient_id,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [doctorId, pairingTokenHash, expiresAt]);
  return result.rows[0] || null;
}

async function findDashboardPairingSessionById({ doctorId, pairingSessionId }) {
  const query = `
    SELECT
      pairing_session_id,
      doctor_id,
      status,
      expires_at,
      confirmed_at,
      confirmed_by_patient_id,
      created_at,
      updated_at
    FROM dashboard_pairing_sessions
    WHERE doctor_id = $1
      AND pairing_session_id = $2
    LIMIT 1
  `;

  const result = await pool.query(query, [doctorId, pairingSessionId]);
  return result.rows[0] || null;
}

async function findActiveDashboardPairingSessionByTokenHash(pairingTokenHash) {
  const query = `
    SELECT
      pairing_session_id,
      doctor_id,
      status,
      expires_at,
      confirmed_at,
      confirmed_by_patient_id,
      created_at,
      updated_at
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
    RETURNING
      pairing_session_id,
      doctor_id,
      status,
      expires_at,
      confirmed_at,
      confirmed_by_patient_id,
      created_at,
      updated_at
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
    RETURNING
      pairing_session_id,
      doctor_id,
      status,
      expires_at,
      confirmed_at,
      confirmed_by_patient_id,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [pairingSessionId]);
  return result.rows[0] || null;
}

module.exports = {
  createDashboardPairingSession,
  findDashboardPairingSessionById,
  findActiveDashboardPairingSessionByTokenHash,
  markDashboardPairingSessionConfirmed,
  markDashboardPairingSessionExpired,
};
