const { pool } = require('../config/database');

async function listDoctorDashboardPatients({ doctorId, q, limit, offset }) {
  const hasSearch = Boolean(q && q.trim());
  const normalizedQ = `%${(q || '').trim()}%`;

  const itemsQuery = `
    SELECT
      u.user_id AS patient_id,
      u.first_name,
      u.last_name,
      u.email,
      p.date_of_birth,
      p.sex,
      latest_dm.measured_at AS latest_measured_at,
      latest_dm.systolic_bp AS latest_systolic_bp,
      latest_dm.diastolic_bp AS latest_diastolic_bp,
      latest_dm.weight AS latest_weight,
      latest_dm.height AS latest_height,
      latest_dm.bmi AS latest_bmi
    FROM doctor_patients dp
    JOIN users u ON u.user_id = dp.patient_id
    LEFT JOIN patient_profiles p ON p.patient_id = dp.patient_id
    LEFT JOIN LATERAL (
      SELECT
        dm.time_stamp AS measured_at,
        dm.systolic_pressure AS systolic_bp,
        dm.diastolic_pressure AS diastolic_bp,
        dm.body_weight AS weight,
        dm.body_height AS height,
        dm.bmi AS bmi
      FROM heart_diaries hd
      JOIN daily_metrics dm ON dm.diary_id = hd.diary_id
      WHERE hd.user_id = dp.patient_id
      ORDER BY dm.time_stamp DESC
      LIMIT 1
    ) latest_dm ON TRUE
    WHERE dp.doctor_id = $1
      AND dp.is_active = TRUE
      AND ($2::BOOLEAN = FALSE OR (
        u.first_name ILIKE $3 OR
        u.last_name ILIKE $3 OR
        u.email ILIKE $3 OR
        u.user_id::TEXT ILIKE $3
      ))
    ORDER BY COALESCE(latest_dm.measured_at, dp.linked_at) DESC, u.first_name ASC
    LIMIT $4 OFFSET $5
  `;

  const totalQuery = `
    SELECT COUNT(*)::INT AS total
    FROM doctor_patients dp
    JOIN users u ON u.user_id = dp.patient_id
    WHERE dp.doctor_id = $1
      AND dp.is_active = TRUE
      AND ($2::BOOLEAN = FALSE OR (
        u.first_name ILIKE $3 OR
        u.last_name ILIKE $3 OR
        u.email ILIKE $3 OR
        u.user_id::TEXT ILIKE $3
      ))
  `;

  const [itemsResult, totalResult] = await Promise.all([
    pool.query(itemsQuery, [doctorId, hasSearch, normalizedQ, limit, offset]),
    pool.query(totalQuery, [doctorId, hasSearch, normalizedQ]),
  ]);

  return {
    items: itemsResult.rows,
    totalItems: totalResult.rows[0]?.total || 0,
  };
}

async function getDoctorPatientIdentity({ doctorId, patientId }) {
  const query = `
    SELECT
      u.user_id AS patient_id,
      u.first_name,
      u.last_name,
      u.email,
      u.tel_no,
      p.date_of_birth,
      p.sex
    FROM doctor_patients dp
    JOIN users u ON u.user_id = dp.patient_id
    LEFT JOIN patient_profiles p ON p.patient_id = dp.patient_id
    WHERE dp.doctor_id = $1
      AND dp.patient_id = $2
      AND dp.is_active = TRUE
    LIMIT 1
  `;

  const result = await pool.query(query, [doctorId, patientId]);
  return result.rows[0] || null;
}

async function getLatestDailyMetrics(patientId) {
  const query = `
    SELECT
      dm.time_stamp AS measured_at,
      dm.systolic_pressure AS systolic_bp,
      dm.diastolic_pressure AS diastolic_bp,
      dm.body_weight AS weight,
      dm.body_height AS height,
      dm.bmi AS bmi
    FROM heart_diaries hd
    JOIN daily_metrics dm ON dm.diary_id = hd.diary_id
    WHERE hd.user_id = $1
    ORDER BY dm.time_stamp DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows[0] || null;
}

async function listDailyMetricsSeries({ patientId, startAt, endAt }) {
  const query = `
    SELECT
      dm.time_stamp AS measured_at,
      dm.systolic_pressure AS systolic_bp,
      dm.diastolic_pressure AS diastolic_bp,
      dm.body_weight AS weight,
      dm.body_height AS height,
      dm.bmi AS bmi
    FROM heart_diaries hd
    JOIN daily_metrics dm ON dm.diary_id = hd.diary_id
    WHERE hd.user_id = $1
      AND dm.time_stamp BETWEEN $2 AND $3
    ORDER BY dm.time_stamp ASC
  `;

  const result = await pool.query(query, [patientId, startAt, endAt]);
  return result.rows;
}

async function listVitalReadingSeries({ patientId, startAt, endAt }) {
  const query = `
    SELECT
      metric_type,
      value_numeric,
      measured_at
    FROM vital_sign_readings
    WHERE user_id = $1
      AND measured_at BETWEEN $2 AND $3
    ORDER BY measured_at ASC
  `;

  const result = await pool.query(query, [patientId, startAt, endAt]);
  return result.rows;
}

async function getLatestVitalSnapshot(patientId) {
  const query = `
    SELECT DISTINCT ON (metric_type)
      metric_type,
      value_numeric,
      measured_at
    FROM vital_sign_readings
    WHERE user_id = $1
    ORDER BY metric_type, measured_at DESC
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows;
}

module.exports = {
  listDoctorDashboardPatients,
  getDoctorPatientIdentity,
  getLatestDailyMetrics,
  listDailyMetricsSeries,
  listVitalReadingSeries,
  getLatestVitalSnapshot,
};
