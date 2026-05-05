const crypto = require('crypto');
const { NOT_FOUND, CONFLICT } = require('../../constants/httpStatus');
const mlRecommendationRepository = require('../../repositories/mlRecommendationRepository');
const { buildMlV3Payload } = require('../../utils/mlPayloadMapper');
const { createHttpError } = require('../../utils/httpError');

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
    payloadHash: createPayloadHash(mapped.payload),
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

module.exports = {
  createPayloadHash,
  getStrictMlPayload,
  toReadiness,
  ensureMlReady,
};
