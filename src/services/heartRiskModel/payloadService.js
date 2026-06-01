const patientHeartRiskRepository = require('../../repositories/patientHeartRiskRepository');
const {
  HEART_RISK_MODEL_KEY,
  HEART_RISK_ML_VERSION,
  calculateAge,
  createPayloadHash,
  normalizeSexCode,
  toNullableNumber,
  toReadiness,
  ensureHeartRiskReady,
} = require('./shared');
const { createHttpError } = require('../../utils/httpError');
const { NOT_FOUND } = require('../../constants/httpStatus');

function buildHeartRiskPayload(snapshot) {
  const assessment = snapshot.latestAssessment || {};
  const profile = snapshot.patientProfile || {};
  const metric = snapshot.latestBodyMetric || {};

  const payload = {
    age: toNullableNumber(assessment.age) ?? calculateAge(profile.dateOfBirth),
    sex: normalizeSexCode(assessment.sex) ?? normalizeSexCode(profile.sex),
    chest_pain_type: toNullableNumber(assessment.chest_pain_type),
    resting_bp_s: toNullableNumber(assessment.resting_bp_s) ?? toNullableNumber(metric.systolicPressure),
    fasting_blood_sugar: toNullableNumber(assessment.fasting_blood_sugar),
    max_heart_rate: toNullableNumber(assessment.max_heart_rate) ?? toNullableNumber(metric.heartRate),
    exercise_angina: toNullableNumber(assessment.exercise_angina),
    old_peak: toNullableNumber(assessment.old_peak),
    st_slope: toNullableNumber(assessment.st_slope),
  };

  const missingFields = Object.entries(payload)
    .filter(([, value]) => value === null || value === undefined)
    .map(([key]) => key);

  const resolvedFields = Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key]) => key);

  return {
    payload,
    missingFields,
    resolvedFields,
    sourceSummary: {
      assessmentId: assessment.assessmentId || null,
      assessmentDate: assessment.assessmentDate || null,
      derived: {
        ageFromProfile: assessment.age === null || assessment.age === undefined,
        sexFromProfile: assessment.sex === null || assessment.sex === undefined,
        restingBpFromBodyMetric:
          (assessment.resting_bp_s === null || assessment.resting_bp_s === undefined) &&
          metric.systolicPressure !== null &&
          metric.systolicPressure !== undefined,
        maxHeartRateFromBodyMetric:
          (assessment.max_heart_rate === null || assessment.max_heart_rate === undefined) &&
          metric.heartRate !== null &&
          metric.heartRate !== undefined,
      },
      latestBodyMetricMeasuredAt: metric.measuredAt || null,
    },
  };
}

async function getHeartRiskPayload({ userId }) {
  const snapshot = await patientHeartRiskRepository.getPatientHeartRiskSnapshot({ userId });

  if (!snapshot) {
    throw createHttpError('Data pasien untuk second ML tidak ditemukan', NOT_FOUND);
  }

  const mapped = buildHeartRiskPayload(snapshot);
  const assessmentDate =
    mapped.sourceSummary.assessmentDate || new Date().toISOString().slice(0, 10);

  return {
    patientId: userId,
    modelKey: HEART_RISK_MODEL_KEY,
    mlVersion: HEART_RISK_ML_VERSION,
    window: {
      startDate: assessmentDate,
      endDate: assessmentDate,
    },
    payload: mapped.payload,
    payloadHash: createPayloadHash(mapped.payload),
    missingFields: mapped.missingFields,
    resolvedFields: mapped.resolvedFields,
    sourceSummary: mapped.sourceSummary,
  };
}

module.exports = {
  getHeartRiskPayload,
  toReadiness,
  ensureHeartRiskReady,
};
