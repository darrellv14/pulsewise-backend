require('dotenv').config();
const { Pool } = require('pg');

const patientId = process.argv[2];

if (!patientId) {
  console.error('Usage: node scripts/inject-patient-vitals.js <patientId>');
  process.exit(1);
}

const cfg = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'pulsewise',
  user: process.env.POSTGRES_USER || 'pulsewise',
  password: process.env.POSTGRES_PASSWORD || 'pulsewise123',
};

const pool = new Pool(cfg);

(async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT user_id, first_name, last_name, email FROM users WHERE user_id = $1',
      [patientId]
    );

    if (userRes.rowCount === 0) {
      throw new Error(`Patient tidak ditemukan di tabel users: ${patientId}`);
    }

    await client.query(
      `
      INSERT INTO patient_profiles (patient_id, date_of_birth, sex)
      VALUES ($1, $2, $3)
      ON CONFLICT (patient_id)
      DO UPDATE SET
        date_of_birth = EXCLUDED.date_of_birth,
        sex = EXCLUDED.sex
      `,
      [patientId, '1999-12-29', 'male']
    );

    const diaryDate = new Date().toISOString().slice(0, 10);
    const diaryRes = await client.query(
      `
      INSERT INTO heart_diaries (user_id, diary_date)
      VALUES ($1, $2)
      ON CONFLICT (user_id, diary_date)
      DO UPDATE SET diary_date = EXCLUDED.diary_date
      RETURNING diary_id
      `,
      [patientId, diaryDate]
    );

    const diaryId = diaryRes.rows[0].diary_id;
    const measuredAt = new Date().toISOString();

    const systolic = 128;
    const diastolic = 82;
    const weight = 74.2;
    const height = 176.0;
    const bmi = Number((weight / ((height / 100) * (height / 100))).toFixed(2));

    await client.query(
      `
      INSERT INTO daily_metrics (
        diary_id,
        body_height,
        body_weight,
        bmi,
        systolic_pressure,
        diastolic_pressure,
        time_stamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [diaryId, height, weight, bmi, systolic, diastolic, measuredAt]
    );

    await client.query(
      `
      INSERT INTO vital_sign_readings (user_id, source, metric_type, value_numeric, unit, measured_at)
      VALUES
        ($1, $2, 'heart_rate', $3, 'bpm', $4),
        ($1, $2, 'oxygen_saturation', $5, '%', $4)
      `,
      [patientId, 'manual_inject', 78, measuredAt, 97]
    );

    await client.query('COMMIT');

    const latest = await client.query(
      `
      SELECT
        dm.time_stamp AS measured_at,
        dm.systolic_pressure,
        dm.diastolic_pressure,
        dm.body_weight,
        dm.body_height,
        dm.bmi
      FROM heart_diaries hd
      JOIN daily_metrics dm ON dm.diary_id = hd.diary_id
      WHERE hd.user_id = $1
      ORDER BY dm.time_stamp DESC
      LIMIT 1
      `,
      [patientId]
    );

    const vitals = await client.query(
      `
      SELECT metric_type, value_numeric, measured_at
      FROM vital_sign_readings
      WHERE user_id = $1
        AND metric_type IN ('heart_rate', 'oxygen_saturation')
      ORDER BY measured_at DESC
      LIMIT 2
      `,
      [patientId]
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          patient: userRes.rows[0],
          latestDaily: latest.rows[0] || null,
          latestVitalReadings: vitals.rows,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
