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

const DEFAULT_ML_PROFILE = {
  demog1Riagendr: 2,
  demog1Ridreth3: 6,
  demog1Dmdeduc: 4,
  demog1Dmdfmsiz: 3,
  demog1Dmdhhsiz: 3,
  demog1Dmdhhsza: 2,
  demog1Dmdhhszb: 1,
  demog1Dmdhhsze: 0,
  demog1Dmdmartl: 1,
  quest22Smq020: 1,
  quest22Smq890: 1,
  quest22Smq900: 2,
  quest23Smd470: 0,
  quest1Alq111: 2,
};

const DEFAULT_ML_ASSESSMENT = {
  exami1Bpxpls: 1,
  labor1Lbdtcsi: 180,
  labor2Urdflow1: 1.2,
  labor2Urdtime1: 45,
  labor2Urxvol1: 200,
  quest11Hiq011: 1,
  quest12Heq010: 2,
  quest12Heq030: 2,
  quest15Kiq022: 2,
  quest15Kiq026: 2,
  quest16Mcq010: 2,
  quest16Mcq160b: 2,
  quest16Mcq220: 2,
  quest16Mcq300a: 2,
  quest16Mcq300c: 2,
  quest17Dpq020: 0,
  quest17Dpq030: 0,
  quest17Dpq040: 0,
  quest20Pfq061b: 2,
  quest20Pfq061c: 2,
  quest20Pfq061h: 2,
  quest3Cdq009: 2,
  quest3Cdq010: 2,
  quest7Diq010: 2,
  quest9Dlq050: 2,
};

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
      password_hash = EXCLUDED.password_hash,
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
      INSERT INTO patient_profiles (patient_id, date_of_birth, sex, body_height_cm)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (patient_id)
      DO UPDATE SET
        date_of_birth = EXCLUDED.date_of_birth,
        sex = EXCLUDED.sex,
        body_height_cm = EXCLUDED.body_height_cm
    `,
    [patientId, profile.dateOfBirth || null, profile.sex || null, profile.heightCm || null]
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

async function ensurePatientMlProfile(client, patientId, patientConfig) {
  const mlProfile = {
    ...DEFAULT_ML_PROFILE,
    demog1Riagendr: patientConfig.sex === 'female' ? 2 : 1,
  };

  await client.query(
    `
      INSERT INTO patient_ml_profiles (
        patient_id,
        demog1_riagendr,
        demog1_ridreth3,
        demog1_dmdeduc,
        demog1_dmdfmsiz,
        demog1_dmdhhsiz,
        demog1_dmdhhsza,
        demog1_dmdhhszb,
        demog1_dmdhhsze,
        demog1_dmdmartl,
        quest22_smq020,
        quest22_smq890,
        quest22_smq900,
        quest23_smd470,
        quest1_alq111
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      ON CONFLICT (patient_id)
      DO UPDATE SET
        demog1_riagendr = EXCLUDED.demog1_riagendr,
        demog1_ridreth3 = EXCLUDED.demog1_ridreth3,
        demog1_dmdeduc = EXCLUDED.demog1_dmdeduc,
        demog1_dmdfmsiz = EXCLUDED.demog1_dmdfmsiz,
        demog1_dmdhhsiz = EXCLUDED.demog1_dmdhhsiz,
        demog1_dmdhhsza = EXCLUDED.demog1_dmdhhsza,
        demog1_dmdhhszb = EXCLUDED.demog1_dmdhhszb,
        demog1_dmdhhsze = EXCLUDED.demog1_dmdhhsze,
        demog1_dmdmartl = EXCLUDED.demog1_dmdmartl,
        quest22_smq020 = EXCLUDED.quest22_smq020,
        quest22_smq890 = EXCLUDED.quest22_smq890,
        quest22_smq900 = EXCLUDED.quest22_smq900,
        quest23_smd470 = EXCLUDED.quest23_smd470,
        quest1_alq111 = EXCLUDED.quest1_alq111,
        updated_at = NOW()
    `,
    [
      patientId,
      mlProfile.demog1Riagendr,
      mlProfile.demog1Ridreth3,
      mlProfile.demog1Dmdeduc,
      mlProfile.demog1Dmdfmsiz,
      mlProfile.demog1Dmdhhsiz,
      mlProfile.demog1Dmdhhsza,
      mlProfile.demog1Dmdhhszb,
      mlProfile.demog1Dmdhhsze,
      mlProfile.demog1Dmdmartl,
      mlProfile.quest22Smq020,
      mlProfile.quest22Smq890,
      mlProfile.quest22Smq900,
      mlProfile.quest23Smd470,
      mlProfile.quest1Alq111,
    ]
  );
}

async function ensurePatientMlAssessment(client, patientId, assessmentDate) {
  await client.query(
    `
      INSERT INTO patient_ml_assessments (
        patient_id,
        assessment_date,
        exami1_bpxpls,
        labor1_lbdtcsi,
        labor2_urdflow1,
        labor2_urdtime1,
        labor2_urxvol1,
        quest11_hiq011,
        quest12_heq010,
        quest12_heq030,
        quest15_kiq022,
        quest15_kiq026,
        quest16_mcq010,
        quest16_mcq160b,
        quest16_mcq220,
        quest16_mcq300a,
        quest16_mcq300c,
        quest17_dpq020,
        quest17_dpq030,
        quest17_dpq040,
        quest20_pfq061b,
        quest20_pfq061c,
        quest20_pfq061h,
        quest3_cdq009,
        quest3_cdq010,
        quest7_diq010,
        quest9_dlq050
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27
      )
      ON CONFLICT (patient_id, assessment_date)
      DO UPDATE SET
        exami1_bpxpls = EXCLUDED.exami1_bpxpls,
        labor1_lbdtcsi = EXCLUDED.labor1_lbdtcsi,
        labor2_urdflow1 = EXCLUDED.labor2_urdflow1,
        labor2_urdtime1 = EXCLUDED.labor2_urdtime1,
        labor2_urxvol1 = EXCLUDED.labor2_urxvol1,
        quest11_hiq011 = EXCLUDED.quest11_hiq011,
        quest12_heq010 = EXCLUDED.quest12_heq010,
        quest12_heq030 = EXCLUDED.quest12_heq030,
        quest15_kiq022 = EXCLUDED.quest15_kiq022,
        quest15_kiq026 = EXCLUDED.quest15_kiq026,
        quest16_mcq010 = EXCLUDED.quest16_mcq010,
        quest16_mcq160b = EXCLUDED.quest16_mcq160b,
        quest16_mcq220 = EXCLUDED.quest16_mcq220,
        quest16_mcq300a = EXCLUDED.quest16_mcq300a,
        quest16_mcq300c = EXCLUDED.quest16_mcq300c,
        quest17_dpq020 = EXCLUDED.quest17_dpq020,
        quest17_dpq030 = EXCLUDED.quest17_dpq030,
        quest17_dpq040 = EXCLUDED.quest17_dpq040,
        quest20_pfq061b = EXCLUDED.quest20_pfq061b,
        quest20_pfq061c = EXCLUDED.quest20_pfq061c,
        quest20_pfq061h = EXCLUDED.quest20_pfq061h,
        quest3_cdq009 = EXCLUDED.quest3_cdq009,
        quest3_cdq010 = EXCLUDED.quest3_cdq010,
        quest7_diq010 = EXCLUDED.quest7_diq010,
        quest9_dlq050 = EXCLUDED.quest9_dlq050,
        updated_at = NOW()
    `,
    [
      patientId,
      assessmentDate,
      DEFAULT_ML_ASSESSMENT.exami1Bpxpls,
      DEFAULT_ML_ASSESSMENT.labor1Lbdtcsi,
      DEFAULT_ML_ASSESSMENT.labor2Urdflow1,
      DEFAULT_ML_ASSESSMENT.labor2Urdtime1,
      DEFAULT_ML_ASSESSMENT.labor2Urxvol1,
      DEFAULT_ML_ASSESSMENT.quest11Hiq011,
      DEFAULT_ML_ASSESSMENT.quest12Heq010,
      DEFAULT_ML_ASSESSMENT.quest12Heq030,
      DEFAULT_ML_ASSESSMENT.quest15Kiq022,
      DEFAULT_ML_ASSESSMENT.quest15Kiq026,
      DEFAULT_ML_ASSESSMENT.quest16Mcq010,
      DEFAULT_ML_ASSESSMENT.quest16Mcq160b,
      DEFAULT_ML_ASSESSMENT.quest16Mcq220,
      DEFAULT_ML_ASSESSMENT.quest16Mcq300a,
      DEFAULT_ML_ASSESSMENT.quest16Mcq300c,
      DEFAULT_ML_ASSESSMENT.quest17Dpq020,
      DEFAULT_ML_ASSESSMENT.quest17Dpq030,
      DEFAULT_ML_ASSESSMENT.quest17Dpq040,
      DEFAULT_ML_ASSESSMENT.quest20Pfq061b,
      DEFAULT_ML_ASSESSMENT.quest20Pfq061c,
      DEFAULT_ML_ASSESSMENT.quest20Pfq061h,
      DEFAULT_ML_ASSESSMENT.quest3Cdq009,
      DEFAULT_ML_ASSESSMENT.quest3Cdq010,
      DEFAULT_ML_ASSESSMENT.quest7Diq010,
      DEFAULT_ML_ASSESSMENT.quest9Dlq050,
    ]
  );
}

async function ensureMedicationSetup(client, patientId) {
  const medicationResult = await client.query(
    `
      INSERT INTO medications (
        user_id,
        name,
        description,
        condition_tag,
        form,
        color,
        single_dose,
        single_dose_unit,
        start_date,
        frequency,
        num_of_days,
        note
      )
      VALUES (
        $1,
        'Aspirin',
        'Seed dashboard medication',
        'heart',
        'tablet',
        'white',
        1,
        'tablet',
        CURRENT_DATE,
        'daily',
        7,
        'Setelah makan pagi dan malam'
      )
      ON CONFLICT DO NOTHING
      RETURNING medication_id
    `,
    [patientId]
  );

  let medicationId = medicationResult.rows[0]?.medication_id || null;
  if (!medicationId) {
    const existing = await client.query(
      `
        SELECT medication_id
        FROM medications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [patientId]
    );
    medicationId = existing.rows[0]?.medication_id || null;
  }

  if (!medicationId) {
    throw new Error(`Medication seed gagal untuk patientId ${patientId}`);
  }

  await client.query(
    `
      UPDATE medications
      SET
        form = 'tablet',
        color = 'white',
        single_dose = 1,
        single_dose_unit = 'tablet',
        start_date = CURRENT_DATE,
        frequency = 'daily',
        num_of_days = 7,
        note = 'Setelah makan pagi dan malam'
      WHERE medication_id = $1
    `,
    [medicationId]
  );

  await client.query('DELETE FROM medication_schedules WHERE user_id = $1 AND medication_id = $2', [
    patientId,
    medicationId,
  ]);

  await client.query(
    `
      INSERT INTO medication_schedules (user_id, medication_id, schedule_time, day_of_week)
      VALUES
        ($1, $2, '08:00', NULL),
        ($1, $2, '20:00', NULL)
    `,
    [patientId, medicationId]
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

  await client.query(
    `
      INSERT INTO daily_symptoms (
        diary_id,
        symptom_name,
        symptom_code,
        body_area,
        is_chest_pain,
        pain_frequency_code,
        pain_location_code,
        intensity,
        note,
        time_stamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      diaryId,
      'Mild chest discomfort',
      'chest_pain',
      'chest',
      true,
      1,
      2,
      3,
      'Keluhan singkat setelah aktivitas berat',
      measuredAt,
    ]
  );

  await client.query(
    `
      INSERT INTO daily_activities (
        diary_id,
        name,
        duration,
        heart_rate,
        activity_category,
        intensity_level,
        transport_mode,
        outdoor_minutes,
        user_feeling,
        note,
        time_stamp
      )
      VALUES
        ($1, 'Berkebun', 45, 108, 'work', 'vigorous', NULL, 30, 'baik', 'Aktivitas luar ruangan', $2),
        ($1, 'Jalan kaki ke minimarket', 20, 92, 'transport', 'moderate', 'walk', 15, 'baik', 'Pergi sore hari', $3),
        ($1, 'Latihan kardio ringan', 30, 118, 'recreation', 'vigorous', NULL, 10, 'cukup', 'Sesi rutin', $4)
    `,
    [
      diaryId,
      `${diaryDate}T06:45:00.000Z`,
      `${diaryDate}T17:10:00.000Z`,
      `${diaryDate}T19:00:00.000Z`,
    ]
  );

  await client.query(
    `
      INSERT INTO daily_consumptions (
        diary_id,
        type,
        name,
        portion,
        nutrition_source,
        energy_kcal,
        protein_g,
        carbohydrate_g,
        sugar_g,
        fiber_g,
        total_fat_g,
        saturated_fat_g,
        monounsaturated_fat_g,
        polyunsaturated_fat_g,
        cholesterol_mg,
        calcium_mg,
        note,
        time_stamp
      )
      VALUES ($1, 'food', 'Menu sarapan seimbang', '1 porsi', 'seed-dashboard-data', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Snapshot nutrisi harian', $13)
    `,
    [diaryId, 650, 35, 70, 12, 9, 20, 6, 7, 5, 120, 300, `${diaryDate}T07:30:00.000Z`]
  );

  await client.query(
    `
      INSERT INTO daily_sleep_records (diary_id, sleep_time, wake_time, sleep_duration_hours, source)
      VALUES ($1, $2::time, $3::time, $4, $5)
      ON CONFLICT (diary_id)
      DO UPDATE SET
        sleep_time = EXCLUDED.sleep_time,
        wake_time = EXCLUDED.wake_time,
        sleep_duration_hours = EXCLUDED.sleep_duration_hours,
        source = EXCLUDED.source,
        updated_at = NOW()
    `,
    [diaryId, '22:30', '06:30', 8, 'seed-dashboard-data']
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

  const assessmentDate = new Date();
  assessmentDate.setUTCDate(assessmentDate.getUTCDate() - 1);
  assessmentDate.setUTCHours(0, 0, 0, 0);
  await ensurePatientMlAssessment(client, patientId, assessmentDate.toISOString().slice(0, 10));
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
      await ensurePatientMlProfile(client, patientUserId, patientConfig);
      await ensureDoctorPatientLink(client, doctorUserId, patientUserId);
      await seedPatientTimeseries(client, patientUserId, patientConfig);
      await ensureMedicationSetup(client, patientUserId);

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

module.exports = {
  DEFAULT_PASSWORD_HASH,
  DATA_SOURCE,
  DAYS_TO_SEED,
  getPool,
  ensureRoleId,
  ensureUser,
  ensureUserRole,
  ensureDoctorProfile,
  ensurePatientProfile,
  ensureDoctorPatientLink,
  ensurePatientMlProfile,
  ensurePatientMlAssessment,
  ensureMedicationSetup,
  clearPatientHealthData,
  computeSeedMetrics,
  seedOneDay,
  seedPatientTimeseries,
  run,
};

if (require.main === module) {
  run();
}
