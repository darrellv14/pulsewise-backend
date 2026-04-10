const { pool } = require('../config/database');

async function findDuplicateReading({
  userId,
  source,
  metricType,
  measuredAt,
  valueNumeric,
  unit,
}) {
  const query = `
    SELECT
      reading_id,
      user_id,
      source,
      metric_type,
      value_numeric,
      unit,
      payload,
      measured_at,
      received_at
    FROM vital_sign_readings
    WHERE user_id = $1
      AND source = $2
      AND LOWER(metric_type) = LOWER($3)
      AND measured_at = $4
      AND (
        (value_numeric IS NULL AND $5::NUMERIC IS NULL)
        OR value_numeric = $5::NUMERIC
      )
      AND COALESCE(unit, '') = COALESCE($6, '')
    ORDER BY reading_id DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [
    userId,
    source,
    metricType,
    measuredAt,
    valueNumeric,
    unit,
  ]);
  return result.rows[0] || null;
}

async function insertReading({
  userId,
  source,
  metricType,
  valueNumeric,
  unit,
  payload,
  measuredAt,
}) {
  const query = `
    INSERT INTO vital_sign_readings (
      user_id,
      source,
      metric_type,
      value_numeric,
      unit,
      payload,
      measured_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING
      reading_id,
      user_id,
      source,
      metric_type,
      value_numeric,
      unit,
      payload,
      measured_at,
      received_at
  `;

  const result = await pool.query(query, [
    userId,
    source,
    metricType,
    valueNumeric,
    unit,
    payload,
    measuredAt,
  ]);

  return result.rows[0] || null;
}

async function listReadings({ userId, source, metricType, startAt, endAt, limit, offset }) {
  const params = [userId];
  const conditions = ['user_id = $1'];

  if (source) {
    params.push(source);
    conditions.push(`source = $${params.length}`);
  }

  if (metricType) {
    params.push(metricType);
    conditions.push(`LOWER(metric_type) = LOWER($${params.length})`);
  }

  if (startAt) {
    params.push(startAt);
    conditions.push(`measured_at >= $${params.length}`);
  }

  if (endAt) {
    params.push(endAt);
    conditions.push(`measured_at <= $${params.length}`);
  }

  params.push(limit);
  const limitParamIndex = params.length;
  params.push(offset);
  const offsetParamIndex = params.length;

  const query = `
    SELECT
      reading_id,
      user_id,
      source,
      metric_type,
      value_numeric,
      unit,
      payload,
      measured_at,
      received_at
    FROM vital_sign_readings
    WHERE ${conditions.join(' AND ')}
    ORDER BY measured_at DESC, reading_id DESC
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

async function countReadings({ userId, source, metricType, startAt, endAt }) {
  const params = [userId];
  const conditions = ['user_id = $1'];

  if (source) {
    params.push(source);
    conditions.push(`source = $${params.length}`);
  }

  if (metricType) {
    params.push(metricType);
    conditions.push(`LOWER(metric_type) = LOWER($${params.length})`);
  }

  if (startAt) {
    params.push(startAt);
    conditions.push(`measured_at >= $${params.length}`);
  }

  if (endAt) {
    params.push(endAt);
    conditions.push(`measured_at <= $${params.length}`);
  }

  const query = `
    SELECT COUNT(*)::INT AS total
    FROM vital_sign_readings
    WHERE ${conditions.join(' AND ')}
  `;

  const result = await pool.query(query, params);
  return result.rows[0]?.total || 0;
}

module.exports = {
  findDuplicateReading,
  insertReading,
  listReadings,
  countReadings,
};
