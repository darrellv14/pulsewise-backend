require('dotenv').config({ override: true });
const prisma = require('../../src/config/prisma');
const { getStrictMlPayload } = require('../../src/services/ml/payloadService');

const {
  DEFAULT_PASSWORD_HASH,
  getPool,
  ensureRoleId,
  ensureUser,
  ensureUserRole,
  ensureDoctorProfile,
  ensurePatientProfile,
  ensureDoctorPatientLink,
  ensurePatientMlProfile,
  ensureMedicationSetup,
  seedPatientTimeseries,
} = require('./seed-dashboard-data');

const LOAD_TEST_PATIENT_COUNT = Number(process.env.LOAD_TEST_PATIENT_COUNT || 200);
const LOAD_TEST_DOCTOR_EMAIL = process.env.LOAD_TEST_DOCTOR_EMAIL || 'load.doctor@pulsewise.local';
const LOAD_TEST_DOCTOR_USERNAME = process.env.LOAD_TEST_DOCTOR_USERNAME || 'loadtestdoctor';
const LOAD_TEST_EMAIL_PREFIX = process.env.LOAD_TEST_EMAIL_PREFIX || 'load.patient';
const LOAD_TEST_EMAIL_DOMAIN = process.env.LOAD_TEST_EMAIL_DOMAIN || 'pulsewise.local';
const LOAD_TEST_VERIFY_READINESS = process.env.LOAD_TEST_VERIFY_READINESS !== 'false';
const LOAD_TEST_VERIFY_SAMPLE_SIZE = Number(process.env.LOAD_TEST_VERIFY_SAMPLE_SIZE || 0);

const FIRST_NAMES = [
  'Ari',
  'Nadia',
  'Bima',
  'Sinta',
  'Raka',
  'Putri',
  'Dion',
  'Laras',
  'Farhan',
  'Citra',
  'Bayu',
  'Nabila',
  'Rizky',
  'Ayu',
  'Fajar',
  'Tasya',
  'Yoga',
  'Intan',
  'Dimas',
  'Shinta',
];

const LAST_NAMES = [
  'Pratama',
  'Saraswati',
  'Mahendra',
  'Lestari',
  'Wicaksono',
  'Permata',
  'Saputra',
  'Rahmawati',
  'Kusuma',
  'Aditya',
  'Nugraha',
  'Puspita',
  'Hidayat',
  'Anggraini',
  'Firmansyah',
  'Wijaya',
  'Utami',
  'Ramadhan',
  'Handayani',
  'Setiawan',
];

function padNumber(value, size = 3) {
  return String(value).padStart(size, '0');
}

function buildPatientConfig(index) {
  const ordinal = index + 1;
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const sex = index % 2 === 0 ? 'male' : 'female';
  const birthYear = 1984 + (index % 18);
  const birthMonth = ((index % 12) + 1).toString().padStart(2, '0');
  const birthDay = (((index * 3) % 27) + 1).toString().padStart(2, '0');
  const heightCm = sex === 'female' ? 154 + (index % 12) : 166 + (index % 14);
  const baseWeightKg = sex === 'female' ? 52 + (index % 14) : 63 + (index % 18);
  const suffix = padNumber(ordinal, 3);

  return {
    username: `loadpatient${suffix}`,
    email: `${LOAD_TEST_EMAIL_PREFIX}${suffix}@${LOAD_TEST_EMAIL_DOMAIN}`,
    firstName,
    lastName,
    sex,
    dateOfBirth: `${birthYear}-${birthMonth}-${birthDay}`,
    phone: `08139${padNumber(ordinal, 7)}`,
    heightCm,
    baseWeightKg,
  };
}

function resolvePatientsForVerification(seededPatients) {
  if (!LOAD_TEST_VERIFY_SAMPLE_SIZE || LOAD_TEST_VERIFY_SAMPLE_SIZE >= seededPatients.length) {
    return seededPatients;
  }

  return seededPatients.slice(0, LOAD_TEST_VERIFY_SAMPLE_SIZE);
}

async function verifyReadiness(seededPatients) {
  if (!LOAD_TEST_VERIFY_READINESS) {
    return {
      checked: 0,
      failures: [],
      skipped: true,
    };
  }

  const patientsToVerify = resolvePatientsForVerification(seededPatients);
  const failures = [];

  for (const patient of patientsToVerify) {
    const payloadResult = await getStrictMlPayload({ userId: patient.userId });

    if (payloadResult.missingFields.length > 0) {
      failures.push({
        ...patient,
        missingFields: payloadResult.missingFields,
      });
    }
  }

  return {
    checked: patientsToVerify.length,
    failures,
    skipped: false,
  };
}

async function run() {
  const pool = getPool();
  const client = await pool.connect();
  let seededPatients = [];

  try {
    await client.query('BEGIN');

    const doctorRoleId = await ensureRoleId(client, 'doctor');
    const patientRoleId = await ensureRoleId(client, 'patient');

    const doctorUserId = await ensureUser(client, {
      username: LOAD_TEST_DOCTOR_USERNAME,
      email: LOAD_TEST_DOCTOR_EMAIL,
      passwordHash: DEFAULT_PASSWORD_HASH,
      firstName: 'Load',
      lastName: 'Doctor',
      phone: '081399999999',
    });

    await ensureUserRole(client, doctorUserId, doctorRoleId);
    await ensureDoctorProfile(client, doctorUserId);

    for (let index = 0; index < LOAD_TEST_PATIENT_COUNT; index += 1) {
      const patientConfig = buildPatientConfig(index);
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
        email: patientConfig.email,
        fullName: `${patientConfig.firstName} ${patientConfig.lastName}`,
      });
    }

    await client.query('COMMIT');

    const verification = await verifyReadiness(seededPatients);

    console.log('[seed:load-test] done');
    console.log(`[seed:load-test] doctor login: ${LOAD_TEST_DOCTOR_EMAIL} / dev12345`);
    console.log(
      `[seed:load-test] patient cohort: ${LOAD_TEST_PATIENT_COUNT} users from ${LOAD_TEST_EMAIL_PREFIX}001@${LOAD_TEST_EMAIL_DOMAIN} to ${LOAD_TEST_EMAIL_PREFIX}${padNumber(
        LOAD_TEST_PATIENT_COUNT,
        3
      )}@${LOAD_TEST_EMAIL_DOMAIN}`
    );
    console.log('[seed:load-test] sample patients:');
    for (const patient of seededPatients.slice(0, 5)) {
      console.log(`  - ${patient.fullName} (${patient.email}) userId=${patient.userId}`);
    }

    if (verification.skipped) {
      console.log('[seed:load-test] readiness verification skipped');
      return;
    }

    console.log(`[seed:load-test] readiness verified for ${verification.checked} patients`);

    if (verification.failures.length > 0) {
      console.error(
        `[seed:load-test] readiness verification failed for ${verification.failures.length} patients`
      );
      for (const failure of verification.failures.slice(0, 10)) {
        console.error(
          `  - ${failure.email} missing=${failure.missingFields.join(', ')}`
        );
      }
      process.exitCode = 1;
      return;
    }

    console.log('[seed:load-test] all verified patients are ML-ready');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seed:load-test] failed', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    await prisma.$disconnect();
  }
}

run();
