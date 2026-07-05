require('dotenv').config({ override: true });
const prisma = require('../../src/config/prisma');
const { getPool, ensureDoctorPatientLink } = require('./seed-dashboard-data');

const PATIENT_EMAIL = process.env.PAIR_PATIENT_EMAIL || 'rizkysetiawanb@pulsewise.com';
const DOCTOR_EMAIL = process.env.PAIR_DOCTOR_EMAIL || 'doctor@pulsewise.local';

async function getUserByEmail(client, email) {
  const { rows } = await client.query(
    `
      SELECT u.user_id, u.email
      FROM users u
      WHERE u.email = $1
      LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
}

async function run() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const doctor = await getUserByEmail(client, DOCTOR_EMAIL);
    if (!doctor) {
      throw new Error(`Doctor ${DOCTOR_EMAIL} tidak ditemukan`);
    }

    const patient = await getUserByEmail(client, PATIENT_EMAIL);
    if (!patient) {
      throw new Error(`Patient ${PATIENT_EMAIL} tidak ditemukan`);
    }

    await ensureDoctorPatientLink(client, doctor.user_id, patient.user_id);

    await client.query('COMMIT');

    console.log('[pair:patient-doctor] done');
    console.log(`[pair:patient-doctor] doctor=${doctor.email} doctorId=${doctor.user_id}`);
    console.log(`[pair:patient-doctor] patient=${patient.email} patientId=${patient.user_id}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[pair:patient-doctor] failed', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    await prisma.$disconnect();
  }
}

run();
