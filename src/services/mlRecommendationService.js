const crypto = require('crypto');
const env = require('../config/env');
const {
  FORBIDDEN,
  NOT_FOUND,
  CONFLICT,
  BAD_GATEWAY,
  SERVICE_UNAVAILABLE,
  GATEWAY_TIMEOUT,
} = require('../constants/httpStatus');
const doctorPatientRepository = require('../repositories/doctorPatientRepository');
const mlRecommendationRepository = require('../repositories/mlRecommendationRepository');
const { buildMlV3Payload } = require('../utils/mlPayloadMapper');

function createHttpError(message, statusCode, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }
  return error;
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '');
}

async function assertPatientRouteAccess({ actor, userId }) {
  if (!actor) {
    throw createHttpError('Aktor tidak valid', FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'patient' || actor.userId !== userId) {
    throw createHttpError('Akses endpoint ML pasien ditolak', FORBIDDEN);
  }
}

async function assertDoctorDashboardRouteAccess({ actor, doctorId, patientId }) {
  if (!actor) {
    throw createHttpError('Aktor tidak valid', FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'doctor' || actor.userId !== doctorId) {
    throw createHttpError('Akses dashboard dokter ditolak', FORBIDDEN);
  }

  const link = await doctorPatientRepository.findDoctorPatientLink({
    doctorId,
    patientId,
  });

  if (!link) {
    throw createHttpError('Dokter tidak memiliki akses ke pasien ini', FORBIDDEN);
  }
}

async function parseJsonSafely(response) {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch (_error) {
    return {
      raw: rawText,
    };
  }
}

async function postJson(url, payload, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestMlEndpoint({ endpointPath, payload, serviceConfig = env.mlService }) {
  const baseUrl = normalizeBaseUrl(serviceConfig.baseUrl);
  const version = Number(serviceConfig.version || 3);
  const timeoutMs = Math.max(1000, Number(serviceConfig.timeoutMs || 20000));
  const endpoint = `${baseUrl}/v${version}${endpointPath}`;

  try {
    const response = await postJson(endpoint, payload, timeoutMs);
    const responseBody = await parseJsonSafely(response);

    if (!response.ok) {
      throw createHttpError('Microservice ML mengembalikan error', BAD_GATEWAY, {
        endpoint,
        upstreamStatus: response.status,
        upstreamBody: responseBody,
      });
    }

    return {
      endpoint,
      status: response.status,
      body: responseBody,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createHttpError('Microservice ML timeout saat memproses request', GATEWAY_TIMEOUT, {
        endpoint,
        timeoutMs,
      });
    }

    if (error.statusCode) {
      throw error;
    }

    throw createHttpError('Microservice ML tidak tersedia atau gagal dihubungi', SERVICE_UNAVAILABLE, {
      endpoint,
      reason: error.message,
    });
  }
}

function createPayloadHash(payload) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

async function getStrictMlPayload({ userId, endDate }) {
  const snapshot = await mlRecommendationRepository.getPatientMlSnapshot({
    userId,
    endDate,
    windowDays: 7,
  });

  if (!snapshot) {
    throw createHttpError('Data pasien untuk ML tidak ditemukan', NOT_FOUND);
  }

  const mapped = buildMlV3Payload(snapshot);

  return {
    patientId: userId,
    mlVersion: 'hfms-v3',
    window: snapshot.window,
    payload: mapped.payload,
    missingFields: mapped.missingFields,
    resolvedFields: mapped.resolvedFields,
    sourceSummary: mapped.sourceSummary,
  };
}

function toReadiness(payloadResult) {
  return {
    ready: payloadResult.missingFields.length === 0,
    missingFields: payloadResult.missingFields,
    resolvedFields: payloadResult.resolvedFields,
    window: payloadResult.window,
    sourceSummary: payloadResult.sourceSummary,
  };
}

function ensureMlReady(payloadResult) {
  if (payloadResult.missingFields.length > 0) {
    throw createHttpError('Data pasien belum siap untuk inference ML', CONFLICT, {
      code: 'ML_NOT_READY',
      ready: false,
      missingFields: payloadResult.missingFields,
      resolvedFields: payloadResult.resolvedFields,
      window: payloadResult.window,
      sourceSummary: payloadResult.sourceSummary,
    });
  }
}

async function getPatientMlReadiness({ actor, userId, query = {} }) {
  await assertPatientRouteAccess({ actor, userId });
  const payloadResult = await getStrictMlPayload({ userId, endDate: query.date || null });
  return toReadiness(payloadResult);
}

async function getPatientMlPayload({ actor, userId, query = {} }) {
  await assertPatientRouteAccess({ actor, userId });
  const payloadResult = await getStrictMlPayload({ userId, endDate: query.date || null });
  ensureMlReady(payloadResult);

  return {
    mlVersion: payloadResult.mlVersion,
    window: payloadResult.window,
    payload: payloadResult.payload,
    sourceSummary: payloadResult.sourceSummary,
  };
}

async function getPatientMlPredictions({ actor, userId, query = {} }) {
  await assertPatientRouteAccess({ actor, userId });
  const payloadResult = await getStrictMlPayload({ userId, endDate: query.date || null });
  ensureMlReady(payloadResult);

  const upstream = await requestMlEndpoint({
    endpointPath: '/predictions/',
    payload: payloadResult.payload,
  });

  const responseData = {
    mlVersion: payloadResult.mlVersion,
    window: payloadResult.window,
    payloadHash: createPayloadHash(payloadResult.payload),
    sourceSummary: payloadResult.sourceSummary,
    upstream,
  };

  if (query.includePayload) {
    responseData.payload = payloadResult.payload;
  }

  return responseData;
}

async function getPatientMlRecommendations({ actor, userId, query = {} }) {
  await assertPatientRouteAccess({ actor, userId });
  const payloadResult = await getStrictMlPayload({ userId, endDate: query.date || null });
  ensureMlReady(payloadResult);

  const upstream = await requestMlEndpoint({
    endpointPath: '/recommendations/',
    payload: payloadResult.payload,
  });

  const responseData = {
    mlVersion: payloadResult.mlVersion,
    window: payloadResult.window,
    payloadHash: createPayloadHash(payloadResult.payload),
    sourceSummary: payloadResult.sourceSummary,
    upstream,
  };

  if (query.includePayload) {
    responseData.payload = payloadResult.payload;
  }

  return responseData;
}

async function getDoctorDashboardPatientMlReadiness({ actor, doctorId, patientId, query = {} }) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const payloadResult = await getStrictMlPayload({ userId: patientId, endDate: query.date || null });
  return toReadiness(payloadResult);
}

async function getDoctorDashboardPatientMlPayload({ actor, doctorId, patientId, query = {} }) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const payloadResult = await getStrictMlPayload({ userId: patientId, endDate: query.date || null });
  ensureMlReady(payloadResult);

  return {
    mlVersion: payloadResult.mlVersion,
    window: payloadResult.window,
    payload: payloadResult.payload,
    sourceSummary: payloadResult.sourceSummary,
  };
}

async function getDoctorDashboardPatientMlPredictions({
  actor,
  doctorId,
  patientId,
  query = {},
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const payloadResult = await getStrictMlPayload({ userId: patientId, endDate: query.date || null });
  ensureMlReady(payloadResult);

  const upstream = await requestMlEndpoint({
    endpointPath: '/predictions/',
    payload: payloadResult.payload,
  });

  const responseData = {
    mlVersion: payloadResult.mlVersion,
    window: payloadResult.window,
    payloadHash: createPayloadHash(payloadResult.payload),
    sourceSummary: payloadResult.sourceSummary,
    upstream,
  };

  if (query.includePayload) {
    responseData.payload = payloadResult.payload;
  }

  return responseData;
}

async function getDoctorDashboardPatientMlRecommendations({
  actor,
  doctorId,
  patientId,
  query = {},
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const payloadResult = await getStrictMlPayload({ userId: patientId, endDate: query.date || null });
  ensureMlReady(payloadResult);

  const upstream = await requestMlEndpoint({
    endpointPath: '/recommendations/',
    payload: payloadResult.payload,
  });

  const responseData = {
    mlVersion: payloadResult.mlVersion,
    window: payloadResult.window,
    payloadHash: createPayloadHash(payloadResult.payload),
    sourceSummary: payloadResult.sourceSummary,
    upstream,
  };

  if (query.includePayload) {
    responseData.payload = payloadResult.payload;
  }

  return responseData;
}

module.exports = {
  requestMlEndpoint,
  getPatientMlReadiness,
  getPatientMlPayload,
  getPatientMlPredictions,
  getPatientMlRecommendations,
  getDoctorDashboardPatientMlReadiness,
  getDoctorDashboardPatientMlPayload,
  getDoctorDashboardPatientMlPredictions,
  getDoctorDashboardPatientMlRecommendations,
};
