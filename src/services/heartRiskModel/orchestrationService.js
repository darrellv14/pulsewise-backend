const env = require('../../config/env');
const { requestMlEndpoint } = require('../ml/transportService');
const {
  getLatestPatientInferenceResult,
  listPatientInferenceResults,
  getPatientInferenceResultDetail,
  saveInferenceResult,
} = require('../ml/historyService');
const {
  HEART_RISK_MODEL_KEY,
  assertPatientScope,
  assertDoctorDashboardRouteAccess,
} = require('./shared');
const { getHeartRiskPayload, toReadiness, ensureHeartRiskReady } = require('./payloadService');
const patientHeartRiskRepository = require('../../repositories/patientHeartRiskRepository');

async function attachAssessmentDetail(result) {
  const assessmentId = result?.sourceSummary?.assessmentId;
  if (!assessmentId || !result?.patientId) {
    return result;
  }

  const assessment = await patientHeartRiskRepository.getPatientHeartRiskAssessmentById({
    patientId: result.patientId,
    assessmentId,
  });

  return {
    ...result,
    assessment: assessment || null,
  };
}

async function getPatientHeartRiskReadiness({ actor, userId }) {
  await assertPatientScope({ actor, patientId: userId });
  const payloadResult = await getHeartRiskPayload({ userId });
  return toReadiness(payloadResult);
}

async function getDoctorDashboardPatientHeartRiskReadiness({ actor, doctorId, patientId }) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const payloadResult = await getHeartRiskPayload({ userId: patientId });
  return toReadiness(payloadResult);
}

async function runHeartRiskPrediction({ actor, patientId, requestContext, includePayload = false }) {
  const payloadResult = await getHeartRiskPayload({ userId: patientId });
  ensureHeartRiskReady(payloadResult);

  const upstream = await requestMlEndpoint({
    endpointPath: '/predictions',
    payload: payloadResult.payload,
    serviceConfig: env.heartRiskMlService,
  });

  const saved = await saveInferenceResult({
    actor,
    patientId,
    inferenceType: 'prediction',
    modelKey: HEART_RISK_MODEL_KEY,
    requestContext,
    payloadResult,
    upstream,
    includePayload,
  });

  const responseData = {
    resultId: saved.resultId,
    generatedAt: saved.generatedAt,
    modelKey: HEART_RISK_MODEL_KEY,
    mlVersion: payloadResult.mlVersion,
    payloadHash: payloadResult.payloadHash,
    sourceSummary: payloadResult.sourceSummary,
    upstream,
  };

  if (includePayload) {
    responseData.payload = payloadResult.payload;
  }

  return responseData;
}

async function getPatientHeartRiskPredictions({ actor, userId, query = {} }) {
  await assertPatientScope({ actor, patientId: userId });
  return runHeartRiskPrediction({
    actor,
    patientId: userId,
    requestContext: 'patient',
    includePayload: Boolean(query.includePayload),
  });
}

async function getDoctorDashboardPatientHeartRiskPredictions({
  actor,
  doctorId,
  patientId,
  query = {},
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return runHeartRiskPrediction({
    actor,
    patientId,
    requestContext: 'doctor_dashboard',
    includePayload: Boolean(query.includePayload),
  });
}

async function getPatientLatestHeartRiskPrediction({ actor, userId }) {
  await assertPatientScope({ actor, patientId: userId });
  return getLatestPatientInferenceResult({
    actor,
    patientId: userId,
    inferenceType: 'prediction',
    modelKey: HEART_RISK_MODEL_KEY,
  });
}

async function listPatientHeartRiskPredictionHistory({ actor, userId, query = {} }) {
  await assertPatientScope({ actor, patientId: userId });
  return listPatientInferenceResults({
    actor,
    patientId: userId,
    inferenceType: 'prediction',
    modelKey: HEART_RISK_MODEL_KEY,
    query,
  });
}

async function getPatientHeartRiskPredictionHistoryDetail({ actor, userId, resultId }) {
  await assertPatientScope({ actor, patientId: userId });
  const result = await getPatientInferenceResultDetail({
    actor,
    patientId: userId,
    inferenceType: 'prediction',
    modelKey: HEART_RISK_MODEL_KEY,
    resultId,
  });
  return attachAssessmentDetail(result);
}

async function getDoctorDashboardPatientLatestHeartRiskPrediction({ actor, doctorId, patientId }) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return getLatestPatientInferenceResult({
    actor,
    patientId,
    inferenceType: 'prediction',
    modelKey: HEART_RISK_MODEL_KEY,
  });
}

async function listDoctorDashboardPatientHeartRiskPredictionHistory({
  actor,
  doctorId,
  patientId,
  query = {},
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return listPatientInferenceResults({
    actor,
    patientId,
    inferenceType: 'prediction',
    modelKey: HEART_RISK_MODEL_KEY,
    query,
  });
}

async function getDoctorDashboardPatientHeartRiskPredictionHistoryDetail({
  actor,
  doctorId,
  patientId,
  resultId,
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const result = await getPatientInferenceResultDetail({
    actor,
    patientId,
    inferenceType: 'prediction',
    modelKey: HEART_RISK_MODEL_KEY,
    resultId,
  });
  return attachAssessmentDetail(result);
}

module.exports = {
  getPatientHeartRiskReadiness,
  getDoctorDashboardPatientHeartRiskReadiness,
  getPatientHeartRiskPredictions,
  getDoctorDashboardPatientHeartRiskPredictions,
  getPatientLatestHeartRiskPrediction,
  listPatientHeartRiskPredictionHistory,
  getPatientHeartRiskPredictionHistoryDetail,
  getDoctorDashboardPatientLatestHeartRiskPrediction,
  listDoctorDashboardPatientHeartRiskPredictionHistory,
  getDoctorDashboardPatientHeartRiskPredictionHistoryDetail,
};
