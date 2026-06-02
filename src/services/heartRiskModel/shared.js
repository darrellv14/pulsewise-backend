const { CONFLICT, NOT_FOUND } = require('../../constants/httpStatus');
const env = require('../../config/env');
const { createHttpError } = require('../../utils/httpError');
const {
  assertPatientScope,
  calculateAge,
} = require('../care/shared');
const { assertDoctorDashboardRouteAccess } = require('../ml/shared');

const HEART_RISK_MODEL_KEY = 'heart_disease_v1';
const HEART_RISK_ML_VERSION = env.heartRiskMlService.mlVersion;

function createPayloadHash(payload) {
  const crypto = require('crypto');
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

function normalizeSexCode(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (value === 0 || value === 1) {
      return value;
    }
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['male', 'm', 'laki-laki', 'pria', '1'].includes(normalized)) {
    return 1;
  }
  if (['female', 'f', 'perempuan', 'wanita', '0'].includes(normalized)) {
    return 0;
  }

  return null;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toReadiness(payloadResult) {
  return {
    ready: payloadResult.missingFields.length === 0,
    modelKey: payloadResult.modelKey,
    missingFields: payloadResult.missingFields,
    resolvedFields: payloadResult.resolvedFields,
    sourceSummary: payloadResult.sourceSummary,
  };
}

function ensureHeartRiskReady(payloadResult) {
  if (payloadResult.missingFields.length > 0) {
    throw createHttpError('Data pasien belum siap untuk prediksi second ML', CONFLICT, {
      code: 'HEART_RISK_MODEL_NOT_READY',
      modelKey: payloadResult.modelKey,
      ready: false,
      missingFields: payloadResult.missingFields,
      resolvedFields: payloadResult.resolvedFields,
      sourceSummary: payloadResult.sourceSummary,
    });
  }
}

function ensureAssessmentExists(assessment, message) {
  if (!assessment) {
    throw createHttpError(message || 'Assessment second ML pasien tidak ditemukan', NOT_FOUND);
  }

  return assessment;
}

module.exports = {
  HEART_RISK_MODEL_KEY,
  HEART_RISK_ML_VERSION,
  NOT_FOUND,
  assertPatientScope,
  assertDoctorDashboardRouteAccess,
  calculateAge,
  createPayloadHash,
  normalizeSexCode,
  toNullableNumber,
  toReadiness,
  ensureHeartRiskReady,
  ensureAssessmentExists,
};
