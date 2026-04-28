require('dotenv').config({ override: true });
const { Pool } = require('pg');

const DEFAULT_PASSWORD_HASH = '$2b$10$QmRzecCBEih5sWBrnYtLYevTkqgUQJzaqnO.f32e1sfU87Xd8Ha7q'; // dev12345
const DAYS_TO_SEED = 30;
const DATA_SOURCE = 'seed-script';

const SEED_PATIENTS = [
  {
    username: 'seedpatient01',
    email: 'seed.patient1@pulsewise.local',
    firstName: 'Ari',
    lastName: 'Pratama',
    sex: 'male',
    dateOfBirth: '1990-05-12',
    phone: '081200000101',
    heightCm: 170,
    baseWeightKg: 72,
  },
  {
    username: 'seedpatient02',
    email: 'seed.patient2@pulsewise.local',
    firstName: 'Nadia',
    lastName: 'Saraswati',
    sex: 'female',
    dateOfBirth: '1994-09-03',
    phone: '081200000102',
    heightCm: 160,
    baseWeightKg: 60,
  },
];

function getPool() {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'pulsewise',
    user: process.env.POSTGRES_USER || 'pulsewise',
    password: process.env.POSTGRES_PASSWORD || 'pulsewise123',
  });
}

async function ensureRoleId(client, roleCode) {
  const roleResult = await client.query('SELECT role_id FROM roles WHERE code = $1 LIMIT 1', [
    roleCode,
  ]);
  if (roleResult.rowCount === 0) {
    throw new Error(
      `Role ${roleCode} tidak ditemukan. Jalankan migration/seed roles terlebih dahulu.`
    );
  }

  return roleResult.rows[0].role_id;
}

async function ensureUser(client, userPayload) {
  const query = `
    INSERT INTO users (
      username,
      email,
      password_hash,
      first_name,
      last_name,
      tel_no,
      is_active,
      account_status,
      email_verified_at
    ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, 'active', NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      tel_no = EXCLUDED.tel_no,
      is_active = TRUE,
      account_status = 'active',
      email_verified_at = COALESCE(users.email_verified_at, NOW())
    RETURNING user_id
  `;

  const result = await client.query(query, [
    userPayload.username,
    userPayload.email,
    userPayload.passwordHash,
    userPayload.firstName,
    userPayload.lastName,
    userPayload.phone || null,
  ]);

  return result.rows[0].user_id;
}

async function ensureUserRole(client, userId, roleId) {
  await client.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [userId, roleId]
  );
}

async function ensureDoctorProfile(client, doctorId) {
  await client.query(
    `
      INSERT INTO doctor_profiles (doctor_id, specialization, license_no, hospital_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (doctor_id)
      DO UPDATE SET
        specialization = EXCLUDED.specialization,
        license_no = EXCLUDED.license_no,
        hospital_name = EXCLUDED.hospital_name
    `,
    [doctorId, 'Cardiology', 'DOC-SEED-001', 'RS PulseWise']
  );
}

async function ensurePatientProfile(client, patientId, profile) {
  await client.query(
    `
      INSERT INTO patient_profiles (patient_id, date_of_birth, sex)
      VALUES ($1, $2, $3)
      ON CONFLICT (patient_id)
      DO UPDATE SET
        date_of_birth = EXCLUDED.date_of_birth,
        sex = EXCLUDED.sex
    `,
    [patientId, profile.dateOfBirth || null, profile.sex || null]
  );
}

async function ensureDoctorPatientLink(client, doctorId, patientId) {
  await client.query(
    `
      INSERT INTO doctor_patients (doctor_id, patient_id, source, is_active)
      VALUES ($1, $2, 'seed', TRUE)
      ON CONFLICT (doctor_id, patient_id)
      DO UPDATE SET
        source = EXCLUDED.source,
        linked_at = NOW(),
        is_active = TRUE
    `,
    [doctorId, patientId]
  );
}

async function clearPatientHealthData(client, patientId) {
  // Hapus data lama khusus user seed supaya rerun seeder tetap idempotent.
  await client.query('DELETE FROM vital_sign_readings WHERE user_id = $1', [patientId]);
  await client.query('DELETE FROM heart_diaries WHERE user_id = $1', [patientId]);
}

function computeSeedMetrics(dayIndex, patientConfig) {
  const dayWave = Math.sin(dayIndex / 4);
  const longTrend = dayIndex * 0.05;

  const weight = Number((patientConfig.baseWeightKg + dayWave * 0.8 + longTrend).toFixed(2));
  const height = patientConfig.heightCm;
  const bmi = Number((weight / (height / 100) ** 2).toFixed(2));

  const elevatedBp = dayIndex % 11 === 0;
  const elevatedHeart = dayIndex % 9 === 0;
  const dipSpo2 = dayIndex % 13 === 0;

  const systolic = Math.round(118 + Math.sin(dayIndex / 3) * 8 + (elevatedBp ? 18 : 0));
  const diastolic = Math.round(76 + Math.cos(dayIndex / 3) * 6 + (elevatedBp ? 10 : 0));
  const heartRate = Math.round(72 + Math.sin(dayIndex / 2) * 6 + (elevatedHeart ? 14 : 0));
  const oxygenSaturation = Math.round(97 + Math.cos(dayIndex / 5) * 1.2 - (dipSpo2 ? 6 : 0));

  return {
    height,
    weight,
    bmi,
    systolic,
    diastolic,
    heartRate,
    oxygenSaturation,
  };
}

async function seedOneDay(client, patientId, diaryDate, measuredAt, metrics) {
  const diaryResult = await client.query(
    `
      INSERT INTO heart_diaries (user_id, diary_date)
      VALUES ($1, $2)
      ON CONFLICT (user_id, diary_date)
      DO UPDATE SET diary_date = EXCLUDED.diary_date
      RETURNING diary_id
    `,
    [patientId, diaryDate]
  );

  const diaryId = diaryResult.rows[0].diary_id;

  await client.query(
    `
      INSERT INTO daily_metrics (
        diary_id,
        body_height,
        body_weight,
        bmi,
        systolic_pressure,
        diastolic_pressure,
        heart_rate,
        time_stamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      diaryId,
      metrics.height,
      metrics.weight,
      metrics.bmi,
      metrics.systolic,
      metrics.diastolic,
      metrics.heartRate,
      measuredAt,
    ]
  );

  await client.query(
    `
      INSERT INTO vital_sign_readings (user_id, source, metric_type, value_numeric, unit, measured_at)
      VALUES
        ($1, $2, 'heart_rate', $3, 'bpm', $4),
        ($1, $2, 'oxygen_saturation', $5, '%', $4)
    `,
    [patientId, DATA_SOURCE, metrics.heartRate, measuredAt, metrics.oxygenSaturation]
  );
}

async function seedPatientTimeseries(client, patientId, patientConfig) {
  await clearPatientHealthData(client, patientId);

  const now = new Date();
  now.setUTCHours(7, 30, 0, 0);

  for (let i = 0; i < DAYS_TO_SEED; i += 1) {
    const dayOffset = DAYS_TO_SEED - 1 - i;
    const dayDate = new Date(now);
    dayDate.setUTCDate(now.getUTCDate() - dayOffset);

    const diaryDate = dayDate.toISOString().slice(0, 10);
    const measuredAt = new Date(dayDate);
    measuredAt.setUTCHours(7 + (i % 3), 15, 0, 0);

    const metrics = computeSeedMetrics(i, patientConfig);
    await seedOneDay(client, patientId, diaryDate, measuredAt.toISOString(), metrics);
  }
}

async function run() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const doctorRoleId = await ensureRoleId(client, 'doctor');
    const patientRoleId = await ensureRoleId(client, 'patient');

    const doctorUserId = await ensureUser(client, {
      username: 'devdoctor',
      email: process.env.PULSEWISE_DOCTOR_EMAIL || 'doctor@pulsewise.local',
      passwordHash: DEFAULT_PASSWORD_HASH,
      firstName: 'Dev',
      lastName: 'Doctor',
      phone: '081200000001',
    });

    await ensureUserRole(client, doctorUserId, doctorRoleId);
    await ensureDoctorProfile(client, doctorUserId);

    const seededPatients = [];

    for (const patientConfig of SEED_PATIENTS) {
      const patientUserId = await ensureUser(client, {
        ...patientConfig,
        passwordHash: DEFAULT_PASSWORD_HASH,
      });

      await ensureUserRole(client, patientUserId, patientRoleId);
      await ensurePatientProfile(client, patientUserId, patientConfig);
      await ensureDoctorPatientLink(client, doctorUserId, patientUserId);
      await seedPatientTimeseries(client, patientUserId, patientConfig);

      seededPatients.push({
        userId: patientUserId,
        fullName: `${patientConfig.firstName} ${patientConfig.lastName}`,
        email: patientConfig.email,
      });
    }

    await client.query('COMMIT');

    console.log('[seed:dashboard] done');
    console.log(
      `[seed:dashboard] doctor login: ${process.env.PULSEWISE_DOCTOR_EMAIL || 'doctor@pulsewise.local'} / dev12345`
    );
    console.log('[seed:dashboard] patients:');
    for (const patient of seededPatients) {
      console.log(`  - ${patient.fullName} (${patient.email}) userId=${patient.userId}`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seed:dashboard] failed', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
