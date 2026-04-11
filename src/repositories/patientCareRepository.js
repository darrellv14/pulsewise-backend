const { pool } = require('../config/database');

async function listEmergencyContacts({ userId, limit, offset }) {
  const [itemsResult, totalResult] = await Promise.all([
    pool.query(
      `
      SELECT emergency_contact_id, user_id, contact_label, contact_number, is_priority, created_at
      FROM emergency_contacts
      WHERE user_id = $1
      ORDER BY is_priority DESC, created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [userId, limit, offset]
    ),
    pool.query(
      `
      SELECT COUNT(*)::int AS total_items
      FROM emergency_contacts
      WHERE user_id = $1
    `,
      [userId]
    ),
  ]);

  return {
    items: itemsResult.rows,
    totalItems: totalResult.rows[0]?.total_items || 0,
  };
}

async function listHeartDiaries({ userId, startDate, endDate, limit, offset }) {
  const clauses = ['user_id = $1'];
  const values = [userId];

  if (startDate) {
    values.push(startDate);
    clauses.push(`diary_date >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    clauses.push(`diary_date <= $${values.length}`);
  }

  const listValues = [...values, limit, offset];

  const [itemsResult, totalResult] = await Promise.all([
    pool.query(
      `
      SELECT diary_id, user_id, diary_date, created_at
      FROM heart_diaries
      WHERE ${clauses.join(' AND ')}
      ORDER BY diary_date DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
      listValues
    ),
    pool.query(
      `
      SELECT COUNT(*)::int AS total_items
      FROM heart_diaries
      WHERE ${clauses.join(' AND ')}
    `,
      values
    ),
  ]);

  return {
    items: itemsResult.rows,
    totalItems: totalResult.rows[0]?.total_items || 0,
  };
}

async function findPriorityEmergencyContact({ userId, excludeEmergencyContactId = null }) {
  const values = [userId];
  let excludeClause = '';

  if (excludeEmergencyContactId) {
    values.push(excludeEmergencyContactId);
    excludeClause = `AND emergency_contact_id <> $${values.length}`;
  }

  const result = await pool.query(
    `
      SELECT emergency_contact_id, user_id, contact_label, contact_number, is_priority, created_at
      FROM emergency_contacts
      WHERE user_id = $1
        AND is_priority = TRUE
        ${excludeClause}
      LIMIT 1
    `,
    values
  );

  return result.rows[0] || null;
}

async function createEmergencyContact({ userId, contactLabel, contactNumber, isPriority }) {
  const result = await pool.query(
    `
      INSERT INTO emergency_contacts (user_id, contact_label, contact_number, is_priority)
      VALUES ($1, $2, $3, $4)
      RETURNING emergency_contact_id, user_id, contact_label, contact_number, is_priority, created_at
    `,
    [userId, contactLabel, contactNumber, isPriority]
  );

  return result.rows[0] || null;
}

async function updateEmergencyContact({
  userId,
  emergencyContactId,
  contactLabel,
  contactNumber,
  isPriority,
}) {
  const result = await pool.query(
    `
      UPDATE emergency_contacts
      SET contact_label = COALESCE($1, contact_label),
          contact_number = COALESCE($2, contact_number),
          is_priority = COALESCE($3, is_priority)
      WHERE emergency_contact_id = $4
        AND user_id = $5
      RETURNING emergency_contact_id, user_id, contact_label, contact_number, is_priority, created_at
    `,
    [contactLabel, contactNumber, isPriority, emergencyContactId, userId]
  );

  return result.rows[0] || null;
}

async function deleteEmergencyContact({ userId, emergencyContactId }) {
  const result = await pool.query(
    `
      DELETE FROM emergency_contacts
      WHERE emergency_contact_id = $1
        AND user_id = $2
    `,
    [emergencyContactId, userId]
  );

  return result.rowCount;
}

async function upsertHeartDiary({ userId, diaryDate }) {
  const result = await pool.query(
    `
      INSERT INTO heart_diaries (user_id, diary_date)
      VALUES ($1, $2)
      ON CONFLICT (user_id, diary_date)
      DO UPDATE SET diary_date = EXCLUDED.diary_date
      RETURNING diary_id, user_id, diary_date, created_at
    `,
    [userId, diaryDate]
  );

  return result.rows[0] || null;
}

async function getHeartDiaryByDate({ userId, diaryDate }) {
  const result = await pool.query(
    `
      SELECT diary_id, user_id, diary_date, created_at
      FROM heart_diaries
      WHERE user_id = $1
        AND diary_date = $2
      LIMIT 1
    `,
    [userId, diaryDate]
  );

  return result.rows[0] || null;
}

async function getHeartDiary({ userId, diaryId }) {
  const result = await pool.query(
    `
      SELECT diary_id, user_id, diary_date, created_at
      FROM heart_diaries
      WHERE diary_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [diaryId, userId]
  );

  return result.rows[0] || null;
}

async function listDailyBodyMetrics(diaryId) {
  const result = await pool.query(
    `
      SELECT
        metric_id,
        diary_id,
        condition_tag,
        body_height,
        body_weight,
        bmi,
        systolic_pressure,
        diastolic_pressure,
        time_stamp
      FROM daily_metrics
      WHERE diary_id = $1
      ORDER BY time_stamp DESC
    `,
    [diaryId]
  );

  return result.rows;
}

async function getLatestDailyBodyMetric(diaryId) {
  const result = await pool.query(
    `
      SELECT
        metric_id,
        diary_id,
        condition_tag,
        body_height,
        body_weight,
        bmi,
        systolic_pressure,
        diastolic_pressure,
        time_stamp
      FROM daily_metrics
      WHERE diary_id = $1
      ORDER BY time_stamp DESC, metric_id DESC
      LIMIT 1
    `,
    [diaryId]
  );

  return result.rows[0] || null;
}

async function listDailySymptoms(diaryId) {
  const result = await pool.query(
    `
      SELECT symptom_id, diary_id, symptom_name, intensity, note, time_stamp
      FROM daily_symptoms
      WHERE diary_id = $1
      ORDER BY time_stamp DESC
    `,
    [diaryId]
  );

  return result.rows;
}

async function listDailyActivities(diaryId) {
  const result = await pool.query(
    `
      SELECT activity_id, diary_id, name, duration, heart_rate, user_feeling, note, time_stamp
      FROM daily_activities
      WHERE diary_id = $1
      ORDER BY time_stamp DESC
    `,
    [diaryId]
  );

  return result.rows;
}

async function listDailyConsumptions(diaryId) {
  const result = await pool.query(
    `
      SELECT consumption_id, diary_id, type, name, portion, note, time_stamp
      FROM daily_consumptions
      WHERE diary_id = $1
      ORDER BY time_stamp DESC
    `,
    [diaryId]
  );

  return result.rows;
}

async function createDailyBodyMetric({
  diaryId,
  conditionTag,
  bodyHeight,
  bodyWeight,
  bmi,
  systolicPressure,
  diastolicPressure,
  timeStamp,
}) {
  const result = await pool.query(
    `
      INSERT INTO daily_metrics (
        diary_id,
        condition_tag,
        body_height,
        body_weight,
        bmi,
        systolic_pressure,
        diastolic_pressure,
        time_stamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
      RETURNING metric_id, diary_id, condition_tag, body_height, body_weight, bmi, systolic_pressure, diastolic_pressure, time_stamp
    `,
    [
      diaryId,
      conditionTag,
      bodyHeight,
      bodyWeight,
      bmi,
      systolicPressure,
      diastolicPressure,
      timeStamp,
    ]
  );

  return result.rows[0] || null;
}

async function updateDailyBodyMetric({
  metricId,
  conditionTag,
  bodyHeight,
  bodyWeight,
  bmi,
  systolicPressure,
  diastolicPressure,
  timeStamp,
}) {
  const updates = [];
  const values = [];

  if (conditionTag !== undefined) {
    updates.push(`condition_tag = $${values.length + 1}`);
    values.push(conditionTag);
  }

  if (bodyHeight !== undefined) {
    updates.push(`body_height = $${values.length + 1}`);
    values.push(bodyHeight);
  }

  if (bodyWeight !== undefined) {
    updates.push(`body_weight = $${values.length + 1}`);
    values.push(bodyWeight);
  }

  if (bmi !== undefined) {
    updates.push(`bmi = $${values.length + 1}`);
    values.push(bmi);
  }

  if (systolicPressure !== undefined) {
    updates.push(`systolic_pressure = $${values.length + 1}`);
    values.push(systolicPressure);
  }

  if (diastolicPressure !== undefined) {
    updates.push(`diastolic_pressure = $${values.length + 1}`);
    values.push(diastolicPressure);
  }

  if (timeStamp !== undefined) {
    updates.push(`time_stamp = COALESCE($${values.length + 1}, time_stamp)`);
    values.push(timeStamp);
  }

  if (!updates.length) {
    return null;
  }

  values.push(metricId);
  const result = await pool.query(
    `
      UPDATE daily_metrics
      SET ${updates.join(', ')}
      WHERE metric_id = $${values.length}
      RETURNING metric_id, diary_id, condition_tag, body_height, body_weight, bmi, systolic_pressure, diastolic_pressure, time_stamp
    `,
    values
  );

  return result.rows[0] || null;
}

async function createDailySymptom({ diaryId, symptomName, intensity, note, timeStamp }) {
  const result = await pool.query(
    `
      INSERT INTO daily_symptoms (diary_id, symptom_name, intensity, note, time_stamp)
      VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
      RETURNING symptom_id, diary_id, symptom_name, intensity, note, time_stamp
    `,
    [diaryId, symptomName, intensity, note, timeStamp]
  );

  return result.rows[0] || null;
}

async function createDailyActivity({
  diaryId,
  name,
  duration,
  heartRate,
  userFeeling,
  note,
  timeStamp,
}) {
  const result = await pool.query(
    `
      INSERT INTO daily_activities (diary_id, name, duration, heart_rate, user_feeling, note, time_stamp)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
      RETURNING activity_id, diary_id, name, duration, heart_rate, user_feeling, note, time_stamp
    `,
    [diaryId, name, duration, heartRate, userFeeling, note, timeStamp]
  );

  return result.rows[0] || null;
}

async function createDailyConsumption({ diaryId, type, name, portion, note, timeStamp }) {
  const result = await pool.query(
    `
      INSERT INTO daily_consumptions (diary_id, type, name, portion, note, time_stamp)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
      RETURNING consumption_id, diary_id, type, name, portion, note, time_stamp
    `,
    [diaryId, type, name, portion, note, timeStamp]
  );

  return result.rows[0] || null;
}

async function updateUserAvatar({ userId, avatarPhoto }) {
  const result = await pool.query(
    `
      UPDATE users
      SET avatar_photo = $1,
          updated_at = NOW()
      WHERE user_id = $2
      RETURNING user_id, avatar_photo, updated_at
    `,
    [avatarPhoto, userId]
  );

  return result.rows[0] || null;
}

module.exports = {
  listEmergencyContacts,
  findPriorityEmergencyContact,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  upsertHeartDiary,
  getHeartDiaryByDate,
  listHeartDiaries,
  getHeartDiary,
  listDailyBodyMetrics,
  getLatestDailyBodyMetric,
  listDailySymptoms,
  listDailyActivities,
  listDailyConsumptions,
  createDailyBodyMetric,
  updateDailyBodyMetric,
  createDailySymptom,
  createDailyActivity,
  createDailyConsumption,
  updateUserAvatar,
};
