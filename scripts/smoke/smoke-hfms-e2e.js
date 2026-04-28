require('dotenv').config({ override: true });

const app = require('../../src/app');

const BASE_URL = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 5000}/api/v1`;
const HFMS_BASE_URL = process.env.ML_SERVICE_BASE_URL || 'http://localhost:8080';
const DOCTOR_EMAIL = process.env.SMOKE_DOCTOR_EMAIL || 'doctor@pulsewise.local';
const PATIENT_EMAIL = process.env.SMOKE_PATIENT_EMAIL || 'seed.patient2@pulsewise.local';
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

function summarizePrediction(response) {
  const upstreamBody =
    response.data?.data?.upstream?.body ??
    response.data?.data?.upstream?.result?.body ??
    null;

  return {
    status: response.status,
    label:
      response.data?.result?.label ??
      upstreamBody?.result?.label ??
      response.data?.data?.result?.label ??
      null,
    probability:
      response.data?.probability ??
      upstreamBody?.probability ??
      response.data?.data?.upstream?.probability ??
      null,
    error:
      response.data?.errorDetails ??
      response.data?.error ??
      null,
  };
}

function summarizeRecommendation(response) {
  const recommendation =
    response.data?.recommendationResult ??
    response.data?.data?.upstream?.body?.recommendationResult ??
    response.data?.data?.upstream?.recommendationResult ??
    null;

  return {
    status: response.status,
    hasRecommendation: Boolean(recommendation),
    lifestyleCount: recommendation?.lifestyle?.length ?? 0,
    riskReduction:
      recommendation?.riskReduction ??
      null,
    error:
      response.data?.errorDetails ??
      response.data?.error ??
      null,
  };
}

async function run() {
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(process.env.PORT || 5000, () => resolve(instance));
    instance.once('error', reject);
  });

  try {
    const doctorLogin = await requestJson(BASE_URL, 'POST', '/auth/login', null, {
      email: DOCTOR_EMAIL,
      password: PASSWORD,
    });

    const patientLogin = await requestJson(BASE_URL, 'POST', '/auth/login', null, {
      email: PATIENT_EMAIL,
      password: PASSWORD,
    });

    if (doctorLogin.status !== 200 || !doctorLogin.data?.data?.token) {
      throw new Error(`Doctor login gagal (${doctorLogin.status})`);
    }

    if (patientLogin.status !== 200 || !patientLogin.data?.data?.token) {
      throw new Error(`Patient login gagal (${patientLogin.status})`);
    }

    const doctorToken = doctorLogin.data.data.token;
    const doctorId = doctorLogin.data.data.user.userId;
    const patientToken = patientLogin.data.data.token;
    const patientId = patientLogin.data.data.user.userId;

    const readiness = await requestJson(
      BASE_URL,
      'GET',
      `/users/${patientId}/ml-readiness`,
      patientToken
    );

    const payloadResult = await requestJson(
      BASE_URL,
      'GET',
      `/users/${patientId}/ml-payload`,
      patientToken
    );

    if (payloadResult.status !== 200 || !payloadResult.data?.data?.payload) {
      throw new Error(`ML payload gagal dibentuk (${payloadResult.status})`);
    }

    const payload = payloadResult.data.data.payload;
    const directPrediction = await requestJson(
      HFMS_BASE_URL,
      'POST',
      '/v3/predictions/',
      null,
      payload
    );
    const directRecommendation = await requestJson(
      HFMS_BASE_URL,
      'POST',
      '/v3/recommendations/',
      null,
      payload
    );

    const bridgePrediction = await requestJson(
      BASE_URL,
      'POST',
      `/users/${patientId}/ml-predictions`,
      patientToken
    );
    const bridgeRecommendation = await requestJson(
      BASE_URL,
      'POST',
      `/users/${patientId}/ml-recommendations`,
      patientToken
    );

    const doctorBridgeReadiness = await requestJson(
      BASE_URL,
      'GET',
      `/doctors/${doctorId}/dashboard/patients/${patientId}/ml-readiness`,
      doctorToken
    );
    const doctorBridgePrediction = await requestJson(
      BASE_URL,
      'POST',
      `/doctors/${doctorId}/dashboard/patients/${patientId}/ml-predictions`,
      doctorToken
    );
    const doctorBridgeRecommendation = await requestJson(
      BASE_URL,
      'POST',
      `/doctors/${doctorId}/dashboard/patients/${patientId}/ml-recommendations`,
      doctorToken
    );

    const summary = {
      baseUrl: BASE_URL,
      hfmsBaseUrl: HFMS_BASE_URL,
      readinessStatus: readiness.status,
      readinessReady: readiness.data?.data?.ready ?? null,
      readinessMissingFields: readiness.data?.data?.missingFields?.length ?? null,
      payloadStatus: payloadResult.status,
      payloadFieldCount: Object.keys(payload).length,
      directPrediction: summarizePrediction(directPrediction),
      directRecommendation: summarizeRecommendation(directRecommendation),
      bridgePrediction: summarizePrediction(bridgePrediction),
      bridgeRecommendation: summarizeRecommendation(bridgeRecommendation),
      doctorBridgeReadinessStatus: doctorBridgeReadiness.status,
      doctorBridgePrediction: summarizePrediction(doctorBridgePrediction),
      doctorBridgeRecommendation: summarizeRecommendation(doctorBridgeRecommendation),
    };

    console.log(JSON.stringify(summary, null, 2));

    const failed =
      readiness.status !== 200 ||
      readiness.data?.data?.ready !== true ||
      payloadResult.status !== 200 ||
      Object.keys(payload).length !== 67 ||
      directPrediction.status !== 200 ||
      directRecommendation.status !== 200 ||
      bridgePrediction.status !== 200 ||
      bridgeRecommendation.status !== 200 ||
      doctorBridgeReadiness.status !== 200 ||
      doctorBridgePrediction.status !== 200 ||
      doctorBridgeRecommendation.status !== 200;

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
  console.error('[smoke-hfms-e2e] failed', error.message);
  process.exitCode = 1;
});
