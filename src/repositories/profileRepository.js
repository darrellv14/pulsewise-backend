const { pool } = require('../config/database');

async function listPatientProfiles({ limit, offset, sortBy, order }) {
  const sortable = new Set(['created_at', 'date_of_birth', 'sex']);
  const sortColumn = sortable.has(sortBy) ? sortBy : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const query = `
    SELECT
      p.patient_id,
      p.date_of_birth,
      p.sex,
      p.created_at
    FROM patient_profiles p
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $1 OFFSET $2
  `;

  const totalQuery = 'SELECT COUNT(*)::INT AS total FROM patient_profiles';

  const [itemsResult, totalResult] = await Promise.all([
    pool.query(query, [limit, offset]),
    pool.query(totalQuery),
  ]);

  return {
    items: itemsResult.rows,
    totalItems: totalResult.rows[0]?.total || 0,
  };
}

async function getPatientProfileById(patientId) {
  const query = `
    SELECT
      p.patient_id,
      p.date_of_birth,
      p.sex,
      p.created_at,
      u.first_name,
      u.last_name,
      u.email
    FROM patient_profiles p
    JOIN users u ON u.user_id = p.patient_id
    WHERE p.patient_id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows[0] || null;
}

async function upsertPatientProfile({ patientId, dateOfBirth, sex }) {
  const query = `
    INSERT INTO patient_profiles (
      patient_id,
      date_of_birth,
      sex
    ) VALUES ($1, $2, $3)
    ON CONFLICT (patient_id)
    DO UPDATE SET
      date_of_birth = EXCLUDED.date_of_birth,
      sex = EXCLUDED.sex
    RETURNING patient_id, date_of_birth, sex, created_at
  `;

  const result = await pool.query(query, [patientId, dateOfBirth, sex]);
  return result.rows[0] || null;
}

async function getDoctorProfileById(doctorId) {
  const query = `
    SELECT
      d.doctor_id,
      d.specialization,
      d.license_no,
      d.hospital_name,
      d.created_at,
      u.first_name,
      u.last_name,
      u.email
    FROM doctor_profiles d
    JOIN users u ON u.user_id = d.doctor_id
    WHERE d.doctor_id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [doctorId]);
  return result.rows[0] || null;
}

async function upsertDoctorProfile({ doctorId, specialization, licenseNo, hospitalName }) {
  const query = `
    INSERT INTO doctor_profiles (
      doctor_id,
      specialization,
      license_no,
      hospital_name
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (doctor_id)
    DO UPDATE SET
      specialization = EXCLUDED.specialization,
      license_no = EXCLUDED.license_no,
      hospital_name = EXCLUDED.hospital_name
    RETURNING doctor_id, specialization, license_no, hospital_name, created_at
  `;

  const result = await pool.query(query, [doctorId, specialization, licenseNo, hospitalName]);
  return result.rows[0] || null;
}

module.exports = {
  listPatientProfiles,
  getPatientProfileById,
  upsertPatientProfile,
  getDoctorProfileById,
  upsertDoctorProfile,
};
