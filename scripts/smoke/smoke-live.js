require('dotenv').config({ override: true });

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const DOCTOR_EMAIL = process.env.SMOKE_DOCTOR_EMAIL || 'doctor@pulsewise.local';
const PATIENT_EMAIL = process.env.SMOKE_PATIENT_EMAIL || 'seed.patient2@pulsewise.local';
const PASSWORD = process.env.SMOKE_PASSWORD || 'dev12345';

async function requestJson(method, path, token, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    data = { raw: text };
  }

  return {
    status: response.status,
    data,
  };
}

async function run() {
  const doctorLogin = await requestJson('POST', '/auth/login', null, {
    email: DOCTOR_EMAIL,
    password: PASSWORD,
  });

  if (doctorLogin.status !== 200 || !doctorLogin.data?.data?.token) {
    throw new Error(`Doctor login gagal (${doctorLogin.status})`);
  }

  const patientLogin = await requestJson('POST', '/auth/login', null, {
    email: PATIENT_EMAIL,
    password: PASSWORD,
  });

  if (patientLogin.status !== 200 || !patientLogin.data?.data?.token) {
    throw new Error(`Patient login gagal (${patientLogin.status})`);
  }

  const doctorToken = doctorLogin.data.data.token;
  const doctorId = doctorLogin.data.data.user.userId;
  const patientToken = patientLogin.data.data.token;

  const dashboardPatients = await requestJson(
    'GET',
    `/doctors/${doctorId}/dashboard/patients?page=1&limit=20`,
    doctorToken,
    null
  );

  const ingest = await requestJson('POST', '/biometrics', patientToken, {
    source: 'smoke_manual',
    readings: [
      {
        metricType: 'heart_rate',
        valueNumeric: 76,
        unit: 'bpm',
        measuredAt: new Date().toISOString(),
      },
    ],
  });

  const biometricsHistory = await requestJson(
    'GET',
    '/biometrics?metricType=heart_rate&page=1&limit=5',
    patientToken,
    null
  );

  const summary = {
    baseUrl: BASE_URL,
    doctorLoginStatus: doctorLogin.status,
    patientLoginStatus: patientLogin.status,
    dashboardPatientsStatus: dashboardPatients.status,
    dashboardItems: dashboardPatients.data?.data?.items?.length ?? 0,
    ingestStatus: ingest.status,
    ingestInsertedCount: ingest.data?.data?.insertedCount ?? null,
    ingestDuplicateCount: ingest.data?.data?.duplicateCount ?? null,
    historyStatus: biometricsHistory.status,
    historyItems: biometricsHistory.data?.data?.items?.length ?? 0,
    historyFirstMetric: biometricsHistory.data?.data?.items?.[0]?.metricType ?? null,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (
    doctorLogin.status !== 200 ||
    patientLogin.status !== 200 ||
    dashboardPatients.status !== 200 ||
    ![200, 201].includes(ingest.status) ||
    biometricsHistory.status !== 200
  ) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[smoke-live] failed', error.message);
  process.exitCode = 1;
});
