require('dotenv').config({ override: true });

process.env.HEART_RISK_ML_SERVICE_BASE_URL =
  process.env.HEART_RISK_ML_SERVICE_BASE_URL || 'http://127.0.0.1:8090';
process.env.HEART_RISK_ML_SERVICE_VERSION = process.env.HEART_RISK_ML_SERVICE_VERSION || '1';

const app = require('../../src/app');

const BASE_URL = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
const PATIENT_EMAIL = process.env.SMOKE_PATIENT_EMAIL || 'dev@pulsewise.local';
const DOCTOR_EMAIL = process.env.SMOKE_DOCTOR_EMAIL || 'doctor@pulsewise.local';
const PASSWORD = process.env.SMOKE_PASSWORD || 'dev12345';

async function requestJson(baseUrl, method, path, token, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
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

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

async function run() {
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(process.env.PORT || 5000, () => resolve(instance));
    instance.once('error', reject);
  });

  try {
    const patientLogin = await requestJson(BASE_URL, 'POST', '/auth/login', null, {
      email: PATIENT_EMAIL,
      password: PASSWORD,
    });

    if (patientLogin.status !== 200 || !patientLogin.data?.data?.token) {
      throw new Error(`Patient login gagal (${patientLogin.status})`);
    }

    const doctorLogin = await requestJson(BASE_URL, 'POST', '/auth/login', null, {
      email: DOCTOR_EMAIL,
      password: PASSWORD,
    });

    const patientToken = patientLogin.data.data.token;
    const patientId = patientLogin.data.data.user.userId;
    const doctorToken = doctorLogin.data?.data?.token || null;
    const doctorId = doctorLogin.data?.data?.user?.userId || null;

    const assessmentBody = {
      assessmentDate: todayDateOnly(),
      age: 58,
      sex: 0,
      chest_pain_type: 3,
      resting_bp_s: 151,
      fasting_blood_sugar: 0,
      max_heart_rate: 118,
      exercise_angina: 0,
      old_peak: 0,
      st_slope: 2,
    };

    const saveAssessment = await requestJson(
      BASE_URL,
      'POST',
      `/users/${patientId}/heart-risk-model/assessments`,
      patientToken,
      assessmentBody
    );

    const readiness = await requestJson(
      BASE_URL,
      'GET',
      `/users/${patientId}/heart-risk-model/readiness`,
      patientToken
    );

    let linkDoctor = null;
    if (doctorToken && doctorId) {
      linkDoctor = await requestJson(
        BASE_URL,
        'POST',
        `/doctors/${doctorId}/patients/link-by-patient-id`,
        doctorToken,
        {
          patientId,
        }
      );
    }

    const prediction = await requestJson(
      BASE_URL,
      'POST',
      `/users/${patientId}/heart-risk-model/predictions`,
      patientToken,
      {}
    );

    const latest = await requestJson(
      BASE_URL,
      'GET',
      `/users/${patientId}/heart-risk-model/predictions/latest`,
      patientToken
    );

    const history = await requestJson(
      BASE_URL,
      'GET',
      `/users/${patientId}/heart-risk-model/predictions/history?page=1&limit=5`,
      patientToken
    );

    let doctorReadiness = null;
    if (doctorToken && doctorId) {
      doctorReadiness = await requestJson(
        BASE_URL,
        'GET',
        `/doctors/${doctorId}/dashboard/patients/${patientId}/heart-risk-model/readiness`,
        doctorToken
      );
    }

    const summary = {
      baseUrl: BASE_URL,
      heartRiskBaseUrl: process.env.HEART_RISK_ML_SERVICE_BASE_URL,
      patientLoginStatus: patientLogin.status,
      saveAssessmentStatus: saveAssessment.status,
      readinessStatus: readiness.status,
      readinessReady: readiness.data?.data?.ready ?? null,
      doctorLinkStatus: linkDoctor?.status ?? null,
      predictionStatus: prediction.status,
      predictionBody: prediction.data?.data?.upstream?.body ?? prediction.data?.data ?? null,
      latestStatus: latest.status,
      historyStatus: history.status,
      historyItems: history.data?.data?.items?.length ?? 0,
      doctorReadinessStatus: doctorReadiness?.status ?? null,
      doctorReadinessBody: doctorReadiness?.data?.data ?? null,
    };

    console.log(JSON.stringify(summary, null, 2));

    const failed =
      saveAssessment.status !== 200 ||
      readiness.status !== 200 ||
      readiness.data?.data?.ready !== true ||
      prediction.status !== 200 ||
      latest.status !== 200 ||
      history.status !== 200;

    if (failed) {
      process.exitCode = 1;
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

run().catch((error) => {
  console.error('[smoke:heart-risk:local] failed', error.message);
  process.exit(1);
});
