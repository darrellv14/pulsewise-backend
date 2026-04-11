require('dotenv').config({ override: true });
const { Pool } = require('pg');

function getPool() {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'pulsewise',
    user: process.env.POSTGRES_USER || 'pulsewise',
    password: process.env.POSTGRES_PASSWORD || 'pulsewise123',
  });
}

function toDateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function atUtc(dateOnly, hour, minute) {
  return `${dateOnly}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

async function getUserIdByEmail(client, email) {
  const result = await client.query('SELECT user_id FROM users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0]?.user_id || null;
}

async function ensureDiary(client, userId, diaryDate) {
  const result = await client.query(
    `
      INSERT INTO heart_diaries (user_id, diary_date)
      VALUES ($1, $2)
      ON CONFLICT (user_id, diary_date)
      DO UPDATE SET diary_date = EXCLUDED.diary_date
      RETURNING diary_id
    `,
    [userId, diaryDate]
  );

  return result.rows[0].diary_id;
}

async function clearDiaryChildren(client, diaryId) {
  await client.query('DELETE FROM daily_metrics WHERE diary_id = $1', [diaryId]);
  await client.query('DELETE FROM daily_symptoms WHERE diary_id = $1', [diaryId]);
  await client.query('DELETE FROM daily_activities WHERE diary_id = $1', [diaryId]);
  await client.query('DELETE FROM daily_consumptions WHERE diary_id = $1', [diaryId]);
}

async function seedEmergencyContacts(client, userId) {
  await client.query('DELETE FROM emergency_contacts WHERE user_id = $1', [userId]);

  await client.query(
    `
      INSERT INTO emergency_contacts (user_id, contact_label, contact_number, is_priority)
      VALUES
        ($1, 'Ayah', '081200000001', FALSE),
        ($1, 'Ibu', '081200000002', TRUE)
    `,
    [userId]
  );
}

async function seedHeartDiaries(client, userId) {
  const today = new Date();
  const dates = [
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 2)),
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1)),
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
  ];

  for (const date of dates) {
    const diaryDate = toDateOnly(date);
    const diaryId = await ensureDiary(client, userId, diaryDate);
    await clearDiaryChildren(client, diaryId);

    await client.query(
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [diaryId, 'daily-check', 172, 69.5, 23.5, 122, 80, atUtc(diaryDate, 8, 0)]
    );

    await client.query(
      `
        INSERT INTO daily_symptoms (diary_id, symptom_name, intensity, note, time_stamp)
        VALUES ($1, 'Mild chest discomfort', 3, 'Terjadi setelah aktivitas berat', $2)
      `,
      [diaryId, atUtc(diaryDate, 10, 30)]
    );

    await client.query(
      `
        INSERT INTO daily_activities (diary_id, name, duration, heart_rate, user_feeling, note, time_stamp)
        VALUES ($1, 'Jalan pagi', 35, 96, 'baik', 'Rute taman kota', $2)
      `,
      [diaryId, atUtc(diaryDate, 6, 45)]
    );

    await client.query(
      `
        INSERT INTO daily_consumptions (diary_id, type, name, portion, note, time_stamp)
        VALUES ($1, 'food', 'Oatmeal', '1 mangkuk', 'Tanpa gula tambahan', $2)
      `,
      [diaryId, atUtc(diaryDate, 7, 30)]
    );
  }
}

async function seedMedicationLogs(client, userId) {
  let medicationId = null;

  const medicationResult = await client.query(
    `
      SELECT medication_id
      FROM medications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId]
  );

  medicationId = medicationResult.rows[0]?.medication_id || null;

  if (!medicationId) {
    const created = await client.query(
      `
        INSERT INTO medications (user_id, name, description, condition_tag)
        VALUES ($1, 'Aspirin', 'Seed patient care', 'heart')
        RETURNING medication_id
      `,
      [userId]
    );

    medicationId = created.rows[0].medication_id;
  }

  await client.query('DELETE FROM medication_logs WHERE user_id = $1 AND medication_id = $2', [
    userId,
    medicationId,
  ]);

  const now = new Date();
  const today = toDateOnly(now);
  const yesterday = toDateOnly(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1))
  );

  await client.query(
    `
      INSERT INTO medication_logs (user_id, medication_id, medication_time, medication_date)
      VALUES
        ($1, $2, '08:15', $3),
        ($1, $2, '20:10', $3),
        ($1, $2, '08:20', $4)
    `,
    [userId, medicationId, today, yesterday]
  );
}

async function run() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const patientEmail = process.env.SEED_PATIENT_CARE_EMAIL || 'dev@pulsewise.local';
    const userId = await getUserIdByEmail(client, patientEmail);

    if (!userId) {
      throw new Error(
        `User ${patientEmail} tidak ditemukan. Jalankan terlebih dahulu npm run seed:dev.`
      );
    }

    await seedEmergencyContacts(client, userId);
    await seedHeartDiaries(client, userId);
    await seedMedicationLogs(client, userId);

    await client.query('COMMIT');

    console.log('[seed:patient-care] done');
    console.log(`[seed:patient-care] patient=${patientEmail}`);
    console.log('[seed:patient-care] emergency + diary + medication log seeded');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seed:patient-care] failed', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
