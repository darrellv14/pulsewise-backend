require('dotenv').config({ override: true });
const bcrypt = require('bcrypt');
const prisma = require('../../src/config/prisma');
const { getStrictMlPayload } = require('../../src/services/ml/payloadService');
const {
  getPool,
  ensureRoleId,
  ensureUser,
  ensureUserRole,
  ensureDoctorProfile,
  ensurePatientProfile,
  ensureDoctorPatientLink,
  ensurePatientMlProfile,
  computeSeedMetrics,
} = require('./seed-dashboard-data');

const PATIENT_EMAIL = process.env.SEED_RIZKY_EMAIL || 'rizkysetiawanb@pulsewise.com';
const PATIENT_PASSWORD = process.env.SEED_RIZKY_PASSWORD || 'docrizky';
const SUPPORT_DOCTOR_EMAIL =
  process.env.SEED_RIZKY_DOCTOR_EMAIL || 'seed.doctor.hfms@pulsewise.local';
const SUPPORT_DOCTOR_PASSWORD =
  process.env.SEED_RIZKY_DOCTOR_PASSWORD || 'dev12345';
const DAYS_TO_SEED = Number(process.env.SEED_RIZKY_DAYS || 30);
const SKIP_SUPPORT_DOCTOR = process.env.SEED_RIZKY_SKIP_SUPPORT_DOCTOR === 'true';
const SPECIAL_DIARY_DATE = process.env.SEED_RIZKY_SPECIAL_DATE || '2027-07-04';
const SEED_TIMEZONE = process.env.SEED_RIZKY_TIMEZONE || 'Asia/Jakarta';

const PATIENT_PROFILE = {
  username: 'rizkysetiawanb',
  email: PATIENT_EMAIL,
  firstName: 'Rizky',
  lastName: 'Setiawan',
  phone: '081345678901',
  address: 'Jl. Contoh Sehat No. 72, Surabaya',
  sex: 'male',
  dateOfBirth: '1987-08-14',
  heightCm: 171,
  baseWeightKg: 74,
  bloodType: 'O+',
  healthConnectPreference: 'connect_now',
  healthConnectStatus: 'connected',
  isSmoking: false,
  isElectricSmoking: false,
};

const ML_PROFILE_VALUES = {
  demog1Riagendr: 1,
  demog1Ridreth3: 6,
  demog1Dmdeduc: 5,
  demog1Dmdfmsiz: 4,
  demog1Dmdhhsiz: 4,
  demog1Dmdhhsza: 2,
  demog1Dmdhhszb: 1,
  demog1Dmdhhsze: 0,
  demog1Dmdmartl: 1,
  quest22Smq020: 2,
  quest22Smq890: 2,
  quest22Smq900: 2,
  quest23Smd470: 0,
  quest1Alq111: 1,
};

const ML_ASSESSMENT_VALUES = {
  exami1Bpxpls: 1,
  labor1Lbdtcsi: 176,
  labor2Urdflow1: 1.3,
  labor2Urdtime1: 42,
  labor2Urxvol1: 215,
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

const MEDICATION_BLUEPRINTS = [
  {
    name: 'Bisoprolol',
    description: 'Beta blocker untuk membantu mengontrol denyut jantung dan tekanan darah.',
    form: 'tablet',
    color: 'kuning',
    singleDose: 2.5,
    singleDoseUnit: 'mg',
    frequency: 'daily',
    numOfDays: 1,
    note: 'Diminum setelah sarapan.',
    schedules: ['07:00'],
  },
  {
    name: 'Captopril',
    description: 'ACE inhibitor untuk membantu fungsi jantung dan tekanan darah.',
    form: 'tablet',
    color: 'putih',
    singleDose: 12.5,
    singleDoseUnit: 'mg',
    frequency: 'daily',
    numOfDays: 1,
    note: 'Diminum pagi dan malam.',
    schedules: ['07:30', '19:30'],
  },
  {
    name: 'Furosemide',
    description: 'Diuretik untuk membantu mengurangi retensi cairan.',
    form: 'tablet',
    color: 'putih',
    singleDose: 40,
    singleDoseUnit: 'mg',
    frequency: 'daily',
    numOfDays: 1,
    note: 'Diminum pagi hari.',
    schedules: ['06:30'],
  },
  {
    name: 'Spironolactone',
    description: 'Diuretik hemat kalium untuk terapi gagal jantung.',
    form: 'tablet',
    color: 'krem',
    singleDose: 25,
    singleDoseUnit: 'mg',
    frequency: 'daily',
    numOfDays: 1,
    note: 'Diminum siang hari sesudah makan.',
    schedules: ['12:30'],
  },
  {
    name: 'Aspirin',
    description: 'Antiplatelet untuk membantu mencegah pembekuan darah.',
    form: 'tablet',
    color: 'putih',
    singleDose: 80,
    singleDoseUnit: 'mg',
    frequency: 'daily',
    numOfDays: 1,
    note: 'Diminum malam hari.',
    schedules: ['20:00'],
  },
  {
    name: 'Atorvastatin',
    description: 'Statin untuk membantu kontrol kolesterol.',
    form: 'tablet',
    color: 'putih',
    singleDose: 20,
    singleDoseUnit: 'mg',
    frequency: 'daily',
    numOfDays: 1,
    note: 'Diminum sebelum tidur.',
    schedules: ['21:00'],
  },
];

function toDateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function getDateOnlyInTimeZone(date = new Date(), timeZone = SEED_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

function addDateOnlyDays(dateOnly, days) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days, 0, 0, 0, 0));
  return toDateOnly(next);
}

function atUtc(dateOnly, hour, minute) {
  return `${dateOnly}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

async function deleteExistingUserByEmail(client, email) {
  await client.query('DELETE FROM users WHERE email = $1', [email]);
}

async function updateUserAddress(client, userId, address) {
  await client.query('UPDATE users SET address = $2, updated_at = NOW() WHERE user_id = $1', [
    userId,
    address,
  ]);
}

async function updatePatientProfileExtras(client, patientId, profile) {
  await client.query(
    `
      UPDATE patient_profiles
      SET
        blood_type = $2,
        health_connect_preference = $3,
        health_connect_status = $4,
        is_smoking = $5,
        is_electric_smoking = $6
      WHERE patient_id = $1
    `,
    [
      patientId,
      profile.bloodType,
      profile.healthConnectPreference,
      profile.healthConnectStatus,
      profile.isSmoking,
      profile.isElectricSmoking,
    ]
  );
}

async function insertPatientMlAssessment(client, patientId, assessmentDate) {
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
        $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27
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
      ML_ASSESSMENT_VALUES.exami1Bpxpls,
      ML_ASSESSMENT_VALUES.labor1Lbdtcsi,
      ML_ASSESSMENT_VALUES.labor2Urdflow1,
      ML_ASSESSMENT_VALUES.labor2Urdtime1,
      ML_ASSESSMENT_VALUES.labor2Urxvol1,
      ML_ASSESSMENT_VALUES.quest11Hiq011,
      ML_ASSESSMENT_VALUES.quest12Heq010,
      ML_ASSESSMENT_VALUES.quest12Heq030,
      ML_ASSESSMENT_VALUES.quest15Kiq022,
      ML_ASSESSMENT_VALUES.quest15Kiq026,
      ML_ASSESSMENT_VALUES.quest16Mcq010,
      ML_ASSESSMENT_VALUES.quest16Mcq160b,
      ML_ASSESSMENT_VALUES.quest16Mcq220,
      ML_ASSESSMENT_VALUES.quest16Mcq300a,
      ML_ASSESSMENT_VALUES.quest16Mcq300c,
      ML_ASSESSMENT_VALUES.quest17Dpq020,
      ML_ASSESSMENT_VALUES.quest17Dpq030,
      ML_ASSESSMENT_VALUES.quest17Dpq040,
      ML_ASSESSMENT_VALUES.quest20Pfq061b,
      ML_ASSESSMENT_VALUES.quest20Pfq061c,
      ML_ASSESSMENT_VALUES.quest20Pfq061h,
      ML_ASSESSMENT_VALUES.quest3Cdq009,
      ML_ASSESSMENT_VALUES.quest3Cdq010,
      ML_ASSESSMENT_VALUES.quest7Diq010,
      ML_ASSESSMENT_VALUES.quest9Dlq050,
    ]
  );
}

async function seedEmergencyContacts(client, patientId) {
  await client.query('DELETE FROM emergency_contacts WHERE user_id = $1', [patientId]);
  await client.query(
    `
      INSERT INTO emergency_contacts (user_id, contact_label, contact_number, is_priority)
      VALUES
        ($1, 'Istri', '081234560001', TRUE),
        ($1, 'Anak', '081234560002', FALSE),
        ($1, 'Saudara', '081234560003', FALSE)
    `,
    [patientId]
  );
}

async function seedShareCode(client, patientId) {
  await client.query('DELETE FROM patient_shares WHERE patient_id = $1', [patientId]);
  await client.query(
    `
      INSERT INTO patient_shares (patient_id, share_code, expires_at, created_at)
      VALUES ($1, $2, NOW() + INTERVAL '30 day', NOW())
    `,
    [patientId, 'RIZKY-HFMS-READY']
  );
}

async function clearPatientHealthData(client, patientId) {
  await client.query('DELETE FROM push_notification_logs WHERE user_id = $1', [patientId]);
  await client.query('DELETE FROM fcm_device_tokens WHERE user_id = $1', [patientId]);
  await client.query('DELETE FROM vital_sign_readings WHERE user_id = $1', [patientId]);
  await client.query('DELETE FROM medication_logs WHERE user_id = $1', [patientId]);
  await client.query('DELETE FROM medication_schedules WHERE user_id = $1', [patientId]);
  await client.query('DELETE FROM medications WHERE user_id = $1', [patientId]);
  await client.query('DELETE FROM patient_ml_inference_results WHERE patient_id = $1', [patientId]);
  await client.query('DELETE FROM patient_ml_assessments WHERE patient_id = $1', [patientId]);
  await client.query('DELETE FROM heart_diaries WHERE user_id = $1', [patientId]);
}

async function ensureDiary(client, patientId, diaryDate) {
  const result = await client.query(
    `
      INSERT INTO heart_diaries (user_id, diary_date)
      VALUES ($1, $2)
      ON CONFLICT (user_id, diary_date)
      DO UPDATE SET diary_date = EXCLUDED.diary_date
      RETURNING diary_id
    `,
    [patientId, diaryDate]
  );

  return result.rows[0].diary_id;
}

async function seedOneDay(client, patientId, diaryDate, metrics, dayIndex) {
  const diaryId = await ensureDiary(client, patientId, diaryDate);
  const morningTime = atUtc(diaryDate, 6 + (dayIndex % 2), 45);
  const eveningTime = atUtc(diaryDate, 18, 20);

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
        heart_rate,
        oxygen_saturation,
        time_stamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      diaryId,
      'hfms-rich-seed',
      metrics.height,
      metrics.weight,
      metrics.bmi,
      metrics.systolic,
      metrics.diastolic,
      metrics.heartRate,
      metrics.oxygenSaturation,
      morningTime,
    ]
  );

  await client.query(
    `
      INSERT INTO vital_sign_readings (user_id, source, metric_type, value_numeric, unit, measured_at)
      VALUES
        ($1, 'seed-rich', 'heart_rate', $2, 'bpm', $3),
        ($1, 'seed-rich', 'oxygen_saturation', $4, '%', $3),
        ($1, 'seed-rich', 'systolic_pressure', $5, 'mmHg', $3),
        ($1, 'seed-rich', 'diastolic_pressure', $6, 'mmHg', $3)
    `,
    [
      patientId,
      metrics.heartRate,
      morningTime,
      metrics.oxygenSaturation,
      metrics.systolic,
      metrics.diastolic,
    ]
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
      VALUES
        ($1, 'Nyeri dada ringan', 'chest_pain', 'chest', TRUE, 2, 2, 3, 'Keluhan ringan sesudah aktivitas berat', $2),
        ($1, 'Sesak ringan', 'dyspnea', 'chest', FALSE, NULL, NULL, 2, 'Membaik setelah istirahat', $3)
    `,
    [diaryId, atUtc(diaryDate, 9, 10), eveningTime]
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
        ($1, 'Berkebun pagi', 40, 108, 'work', 'vigorous', NULL, 25, 'baik', 'Aktivitas halaman rumah', $2),
        ($1, 'Jalan kaki ke warung', 18, 90, 'transport', 'moderate', 'walk', 12, 'baik', 'Jalan santai sore', $3),
        ($1, 'Senam jantung', 28, 116, 'recreation', 'vigorous', NULL, 8, 'cukup', 'Latihan rutin komunitas', $4)
    `,
    [diaryId, atUtc(diaryDate, 6, 30), atUtc(diaryDate, 17, 5), atUtc(diaryDate, 19, 0)]
  );

  await client.query(
    `
      INSERT INTO daily_consumptions (
        diary_id,
        type,
        name,
        portion,
        portion_grams,
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
      VALUES
        ($1, 'food', 'Oatmeal pisang', '1 mangkuk', 280, 'seed-rich', 340, 12, 58, 11, 8, 7, 1.5, 2.0, 1.2, 15, 180, 'Sarapan rendah garam', $2),
        ($1, 'food', 'Nasi merah ayam kukus', '1 porsi', 410, 'seed-rich', 520, 32, 68, 7, 9, 14, 3.5, 4.2, 2.5, 70, 220, 'Makan siang seimbang', $3),
        ($1, 'food', 'Sup sayur ikan', '1 porsi', 360, 'seed-rich', 430, 28, 35, 5, 7, 13, 3.0, 4.0, 2.4, 55, 260, 'Makan malam rendah lemak', $4)
    `,
    [diaryId, atUtc(diaryDate, 7, 10), atUtc(diaryDate, 12, 20), atUtc(diaryDate, 19, 15)]
  );

  await client.query(
    `
      INSERT INTO daily_sleep_records (diary_id, sleep_time, wake_time, sleep_duration_hours, source)
      VALUES ($1, '22:20', '06:10', 7.83, 'seed-rich')
      ON CONFLICT (diary_id)
      DO UPDATE SET
        sleep_time = EXCLUDED.sleep_time,
        wake_time = EXCLUDED.wake_time,
        sleep_duration_hours = EXCLUDED.sleep_duration_hours,
        source = EXCLUDED.source,
        updated_at = NOW()
    `,
    [diaryId]
  );
}

async function seedTimeseries(client, patientId) {
  const todayDateOnly = getDateOnlyInTimeZone();

  for (let i = 0; i < DAYS_TO_SEED; i += 1) {
    const diaryDate = addDateOnlyDays(todayDateOnly, -(DAYS_TO_SEED - 1 - i));
    const metrics = computeSeedMetrics(i, PATIENT_PROFILE);
    await seedOneDay(client, patientId, diaryDate, metrics, i);
  }

  const specialMetrics = computeSeedMetrics(DAYS_TO_SEED + 7, PATIENT_PROFILE);
  await seedOneDay(client, patientId, SPECIAL_DIARY_DATE, specialMetrics, DAYS_TO_SEED + 7);

  const assessmentDate = new Date();
  assessmentDate.setUTCDate(assessmentDate.getUTCDate() - 1);
  assessmentDate.setUTCHours(0, 0, 0, 0);
  await insertPatientMlAssessment(client, patientId, assessmentDate.toISOString().slice(0, 10));
}

async function seedMedicationLogsForDate(client, patientId, medicationId, schedules, medicationDate) {
  for (const schedule of schedules) {
    await client.query(
      `
        INSERT INTO medication_logs (user_id, medication_id, status, medication_time, medication_date)
        VALUES ($1, $2, 'taken', $3, $4)
      `,
      [patientId, medicationId, schedule, medicationDate]
    );
  }
}

async function seedMedications(client, patientId) {
  const today = getDateOnlyInTimeZone();
  const yesterday = addDateOnlyDays(today, -1);

  for (const medication of MEDICATION_BLUEPRINTS) {
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
        VALUES ($1, $2, $3, 'heart', $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING medication_id
      `,
      [
        patientId,
        medication.name,
        medication.description,
        medication.form,
        medication.color,
        medication.singleDose,
        medication.singleDoseUnit,
        today,
        medication.frequency,
        medication.numOfDays,
        medication.note,
      ]
    );

    const medicationId = medicationResult.rows[0].medication_id;

    for (const schedule of medication.schedules) {
      await client.query(
        `
          INSERT INTO medication_schedules (user_id, medication_id, schedule_time, day_of_week)
          VALUES ($1, $2, $3, NULL)
        `,
        [patientId, medicationId, schedule]
      );
    }

    await seedMedicationLogsForDate(client, patientId, medicationId, medication.schedules, today);
    await seedMedicationLogsForDate(client, patientId, medicationId, medication.schedules, yesterday);
    await seedMedicationLogsForDate(
      client,
      patientId,
      medicationId,
      medication.schedules,
      SPECIAL_DIARY_DATE
    );
  }
}

async function run() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const patientPasswordHash = await bcrypt.hash(PATIENT_PASSWORD, 10);
    const doctorPasswordHash = await bcrypt.hash(SUPPORT_DOCTOR_PASSWORD, 10);

    await client.query('BEGIN');

    await deleteExistingUserByEmail(client, PATIENT_EMAIL);
    const patientRoleId = await ensureRoleId(client, 'patient');
    let doctorUserId = null;

    if (!SKIP_SUPPORT_DOCTOR) {
      await deleteExistingUserByEmail(client, SUPPORT_DOCTOR_EMAIL);
      const doctorRoleId = await ensureRoleId(client, 'doctor');

      doctorUserId = await ensureUser(client, {
        username: 'seeddoctorhfms',
        email: SUPPORT_DOCTOR_EMAIL,
        passwordHash: doctorPasswordHash,
        firstName: 'Seed',
        lastName: 'Doctor',
        phone: '081399999991',
      });
      await ensureUserRole(client, doctorUserId, doctorRoleId);
      await ensureDoctorProfile(client, doctorUserId);
      await updateUserAddress(client, doctorUserId, 'RS PulseWise, Surabaya');
    }

    const patientUserId = await ensureUser(client, {
      username: PATIENT_PROFILE.username,
      email: PATIENT_PROFILE.email,
      passwordHash: patientPasswordHash,
      firstName: PATIENT_PROFILE.firstName,
      lastName: PATIENT_PROFILE.lastName,
      phone: PATIENT_PROFILE.phone,
    });
    await ensureUserRole(client, patientUserId, patientRoleId);
    await ensurePatientProfile(client, patientUserId, PATIENT_PROFILE);
    await updatePatientProfileExtras(client, patientUserId, PATIENT_PROFILE);
    await updateUserAddress(client, patientUserId, PATIENT_PROFILE.address);
    await ensurePatientMlProfile(client, patientUserId, {
      ...PATIENT_PROFILE,
      ...ML_PROFILE_VALUES,
    });
    await client.query(
      `
        UPDATE patient_ml_profiles
        SET
          demog1_riagendr = $2,
          demog1_ridreth3 = $3,
          demog1_dmdeduc = $4,
          demog1_dmdfmsiz = $5,
          demog1_dmdhhsiz = $6,
          demog1_dmdhhsza = $7,
          demog1_dmdhhszb = $8,
          demog1_dmdhhsze = $9,
          demog1_dmdmartl = $10,
          quest22_smq020 = $11,
          quest22_smq890 = $12,
          quest22_smq900 = $13,
          quest23_smd470 = $14,
          quest1_alq111 = $15,
          updated_at = NOW()
        WHERE patient_id = $1
      `,
      [
        patientUserId,
        ML_PROFILE_VALUES.demog1Riagendr,
        ML_PROFILE_VALUES.demog1Ridreth3,
        ML_PROFILE_VALUES.demog1Dmdeduc,
        ML_PROFILE_VALUES.demog1Dmdfmsiz,
        ML_PROFILE_VALUES.demog1Dmdhhsiz,
        ML_PROFILE_VALUES.demog1Dmdhhsza,
        ML_PROFILE_VALUES.demog1Dmdhhszb,
        ML_PROFILE_VALUES.demog1Dmdhhsze,
        ML_PROFILE_VALUES.demog1Dmdmartl,
        ML_PROFILE_VALUES.quest22Smq020,
        ML_PROFILE_VALUES.quest22Smq890,
        ML_PROFILE_VALUES.quest22Smq900,
        ML_PROFILE_VALUES.quest23Smd470,
        ML_PROFILE_VALUES.quest1Alq111,
      ]
    );

    if (doctorUserId) {
      await ensureDoctorPatientLink(client, doctorUserId, patientUserId);
    }
    await clearPatientHealthData(client, patientUserId);
    await seedEmergencyContacts(client, patientUserId);
    await seedShareCode(client, patientUserId);
    await seedTimeseries(client, patientUserId);
    await seedMedications(client, patientUserId);

    await client.query('COMMIT');

    const readiness = await getStrictMlPayload({ userId: patientUserId });

    console.log('[seed:rizky-hfms-ready] done');
    console.log(`[seed:rizky-hfms-ready] patient=${PATIENT_EMAIL} password=${PATIENT_PASSWORD}`);
    if (doctorUserId) {
      console.log(
        `[seed:rizky-hfms-ready] supportDoctor=${SUPPORT_DOCTOR_EMAIL} password=${SUPPORT_DOCTOR_PASSWORD}`
      );
    } else {
      console.log('[seed:rizky-hfms-ready] supportDoctor skipped');
    }
    console.log(`[seed:rizky-hfms-ready] patientId=${patientUserId}`);
    console.log(`[seed:rizky-hfms-ready] specialDiaryDate=${SPECIAL_DIARY_DATE}`);
    console.log(`[seed:rizky-hfms-ready] payloadFields=${Object.keys(readiness.payload).length}`);
    console.log(
      `[seed:rizky-hfms-ready] resolvedFields=${readiness.resolvedFields.length} missingFields=${readiness.missingFields.length}`
    );

    if (readiness.missingFields.length > 0) {
      console.error(
        `[seed:rizky-hfms-ready] missing=${readiness.missingFields.join(', ')}`
      );
      process.exitCode = 1;
    } else {
      console.log('[seed:rizky-hfms-ready] HFMS payload is fully ready');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seed:rizky-hfms-ready] failed', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    await prisma.$disconnect();
  }
}

run();
