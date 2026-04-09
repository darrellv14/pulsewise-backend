const { pool } = require('../config/database');

async function createPatientShare({ patientId, shareCode, expiresAt, createdBy }) {
  const query = `
    INSERT INTO patient_shares (
      patient_id,
      share_code,
      expires_at,
      created_by
    ) VALUES ($1, $2, $3, $4)
    RETURNING share_id, patient_id, share_code, expires_at, created_by, created_at, revoked_at
  `;

  const result = await pool.query(query, [patientId, shareCode, expiresAt, createdBy]);
  return result.rows[0] || null;
}

async function findActiveShareByCode(shareCode) {
  const query = `
    SELECT
      share_id,
      patient_id,
      share_code,
      expires_at,
      created_by,
      created_at,
      revoked_at
    FROM patient_shares
    WHERE share_code = $1
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [shareCode]);
  return result.rows[0] || null;
}

async function revokeShare(shareId) {
  const query = `
    UPDATE patient_shares
    SET revoked_at = NOW()
    WHERE share_id = $1
    RETURNING share_id, patient_id, share_code, expires_at, created_by, created_at, revoked_at
  `;

  const result = await pool.query(query, [shareId]);
  return result.rows[0] || null;
}

module.exports = {
  createPatientShare,
  findActiveShareByCode,
  revokeShare,
};
