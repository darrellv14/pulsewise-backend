const prisma = require('../config/prisma');

async function listDoctorDashboardPatients({ doctorId, q, limit, offset }) {
  const hasSearch = Boolean(q && q.trim());
  const normalizedQ = `%${(q || '').trim()}%`;

  const items = await prisma.$queryRaw`
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
      latest_dm.heart_rate AS latest_manual_heart_rate,
      latest_dm.measured_at AS latest_manual_heart_rate_measured_at,
      latest_dm.oxygen_saturation AS latest_manual_oxygen_saturation,
      latest_dm.measured_at AS latest_manual_oxygen_saturation_measured_at,
      latest_hr.value_numeric AS latest_heart_rate,
      latest_hr.measured_at AS latest_heart_rate_measured_at,
      latest_spo2.value_numeric AS latest_oxygen_saturation,
      latest_spo2.measured_at AS latest_oxygen_saturation_measured_at,
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
        dm.heart_rate AS heart_rate,
        dm.oxygen_saturation AS oxygen_saturation,
        dm.body_weight AS weight,
        dm.body_height AS height,
        dm.bmi AS bmi
      FROM heart_diaries hd
      JOIN daily_metrics dm ON dm.diary_id = hd.diary_id
      WHERE hd.user_id = dp.patient_id
      ORDER BY dm.time_stamp DESC
      LIMIT 1
    ) latest_dm ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        vsr.value_numeric,
        vsr.measured_at
      FROM vital_sign_readings vsr
      WHERE vsr.user_id = dp.patient_id
        AND LOWER(vsr.metric_type) IN ('heart_rate', 'heartrate', 'hr', 'pulse')
      ORDER BY vsr.measured_at DESC
      LIMIT 1
    ) latest_hr ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        vsr.value_numeric,
        vsr.measured_at
      FROM vital_sign_readings vsr
      WHERE vsr.user_id = dp.patient_id
        AND LOWER(vsr.metric_type) IN ('oxygen_saturation', 'spo2', 'sp02', 'oxygen')
      ORDER BY vsr.measured_at DESC
      LIMIT 1
    ) latest_spo2 ON TRUE
    WHERE dp.doctor_id = ${doctorId}::uuid
      AND dp.is_active = TRUE
      AND (${hasSearch}::BOOLEAN = FALSE OR (
        u.first_name ILIKE ${normalizedQ} OR
        u.last_name ILIKE ${normalizedQ} OR
        u.email ILIKE ${normalizedQ} OR
        u.user_id::TEXT ILIKE ${normalizedQ}
      ))
    ORDER BY COALESCE(
      GREATEST(
        COALESCE(latest_dm.measured_at, '-infinity'::timestamptz),
        COALESCE(latest_hr.measured_at, '-infinity'::timestamptz),
        COALESCE(latest_spo2.measured_at, '-infinity'::timestamptz)
      ),
      dp.linked_at
    ) DESC, u.first_name ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const totalResult = await prisma.$queryRaw`
    SELECT COUNT(*)::INT AS total
    FROM doctor_patients dp
    JOIN users u ON u.user_id = dp.patient_id
    WHERE dp.doctor_id = ${doctorId}::uuid
      AND dp.is_active = TRUE
      AND (${hasSearch}::BOOLEAN = FALSE OR (
        u.first_name ILIKE ${normalizedQ} OR
        u.last_name ILIKE ${normalizedQ} OR
        u.email ILIKE ${normalizedQ} OR
        u.user_id::TEXT ILIKE ${normalizedQ}
      ))
  `;

  return {
    items,
    totalItems: totalResult[0]?.total || 0,
  };
}

async function getDoctorPatientIdentity({ doctorId, patientId }) {
  const result = await prisma.$queryRaw`
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
    WHERE dp.doctor_id = ${doctorId}::uuid
      AND dp.patient_id = ${patientId}::uuid
      AND dp.is_active = TRUE
    LIMIT 1
  `;

  return result[0] || null;
}

async function getPatientIdentity(patientId) {
  const result = await prisma.$queryRaw`
    SELECT
      u.user_id AS patient_id,
      u.first_name,
      u.last_name,
      u.email,
      u.tel_no,
      p.date_of_birth,
      p.sex
    FROM users u
    LEFT JOIN patient_profiles p ON p.patient_id = u.user_id
    WHERE u.user_id = ${patientId}::uuid
    LIMIT 1
  `;

  return result[0] || null;
}

async function getLatestDailyMetrics(patientId) {
  const result = await prisma.$queryRaw`
    SELECT
      dm.time_stamp AS measured_at,
      dm.systolic_pressure AS systolic_bp,
      dm.diastolic_pressure AS diastolic_bp,
      dm.heart_rate AS heart_rate,
      dm.oxygen_saturation AS oxygen_saturation,
      dm.body_weight AS weight,
      dm.body_height AS height,
      dm.bmi AS bmi
    FROM heart_diaries hd
    JOIN daily_metrics dm ON dm.diary_id = hd.diary_id
    WHERE hd.user_id = ${patientId}::uuid
    ORDER BY dm.time_stamp DESC
    LIMIT 1
  `;

  return result[0] || null;
}

async function listDailyMetricsSeries({ patientId, startAt, endAt }) {
  return prisma.$queryRaw`
    SELECT
      dm.time_stamp AS measured_at,
      dm.systolic_pressure AS systolic_bp,
      dm.diastolic_pressure AS diastolic_bp,
      dm.heart_rate AS heart_rate,
      dm.oxygen_saturation AS oxygen_saturation,
      dm.body_weight AS weight,
      dm.body_height AS height,
      dm.bmi AS bmi
    FROM heart_diaries hd
    JOIN daily_metrics dm ON dm.diary_id = hd.diary_id
    WHERE hd.user_id = ${patientId}::uuid
      AND dm.time_stamp BETWEEN ${new Date(startAt)} AND ${new Date(endAt)}
    ORDER BY dm.time_stamp ASC
  `;
}

async function listVitalReadingSeries({ patientId, startAt, endAt }) {
  return prisma.$queryRaw`
    SELECT
      metric_type,
      value_numeric,
      measured_at
    FROM vital_sign_readings
    WHERE user_id = ${patientId}::uuid
      AND measured_at BETWEEN ${new Date(startAt)} AND ${new Date(endAt)}
    ORDER BY measured_at ASC
  `;
}

async function getLatestVitalSnapshot(patientId) {
  return prisma.$queryRaw`
    SELECT DISTINCT ON (metric_type)
      metric_type,
      value_numeric,
      measured_at
    FROM vital_sign_readings
    WHERE user_id = ${patientId}::uuid
    ORDER BY metric_type, measured_at DESC
  `;
}

module.exports = {
  listDoctorDashboardPatients,
  getDoctorPatientIdentity,
  getPatientIdentity,
  getLatestDailyMetrics,
  listDailyMetricsSeries,
  listVitalReadingSeries,
  getLatestVitalSnapshot,
};
