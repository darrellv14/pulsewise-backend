const { pool } = require('../config/database');

async function listDoctorPatients({ doctorId, limit, offset }) {
  const query = `
    SELECT
      dp.doctor_id,
      dp.patient_id,
      dp.source,
      dp.linked_at,
      dp.is_active,
      u.first_name,
      u.last_name,
      u.email
    FROM doctor_patients dp
    JOIN users u ON u.user_id = dp.patient_id
    WHERE dp.doctor_id = $1
      AND dp.is_active = TRUE
    ORDER BY dp.linked_at DESC
    LIMIT $2 OFFSET $3
  `;

  const totalQuery = `
    SELECT COUNT(*)::INT AS total
    FROM doctor_patients
    WHERE doctor_id = $1 AND is_active = TRUE
  `;

  const [itemsResult, totalResult] = await Promise.all([
    pool.query(query, [doctorId, limit, offset]),
    pool.query(totalQuery, [doctorId]),
  ]);

  return {
    items: itemsResult.rows,
    totalItems: totalResult.rows[0]?.total || 0,
  };
}

async function upsertDoctorPatientLink({ doctorId, patientId, source }) {
  const query = `
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
  `;

  const result = await pool.query(query, [doctorId, patientId, source]);
  return result.rows[0] || null;
}

async function deactivateDoctorPatientLink({ doctorId, patientId }) {
  const query = `
    UPDATE doctor_patients
    SET is_active = FALSE
    WHERE doctor_id = $1 AND patient_id = $2
    RETURNING doctor_id, patient_id, source, linked_at, is_active
  `;

  const result = await pool.query(query, [doctorId, patientId]);
  return result.rows[0] || null;
}

module.exports = {
  listDoctorPatients,
  upsertDoctorPatientLink,
  deactivateDoctorPatientLink,
};
