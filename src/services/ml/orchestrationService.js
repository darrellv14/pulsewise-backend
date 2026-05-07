const {
  INFERENCE_TYPES,
} = require('./shared');
const {
  toReadiness,
  assertDoctorDashboardRouteAccess,
  getPatientPayloadResult,
  getDoctorPayloadResult,
  getReadyPatientPayloadResult,
  getReadyDoctorPayloadResult,
  toPayloadResponse,
} = require('./accessService');
const { runInference } = require('./inferenceExecutionService');
const {
  getLatestPatientInferenceResult,
  listPatientInferenceResults,
  getPatientInferenceResultDetail,
} = require('./historyService');

async function getPatientMlReadiness({ actor, userId, query = {} }) {
  const payloadResult = await getPatientPayloadResult({ actor, userId, query });
  return toReadiness(payloadResult);
}

async function getPatientMlPayload({ actor, userId, query = {} }) {
  const payloadResult = await getPatientPayloadResult({ actor, userId, query });
  return toPayloadResponse(payloadResult);
}

async function runPatientInference({
  actor,
  userId,
  query = {},
  inferenceType,
  requestContext = 'patient',
}) {
  const payloadResult = await getReadyPatientPayloadResult({ actor, userId, query });
  return runInference({
    actor,
    patientId: userId,
    inferenceType,
    requestContext,
    payloadResult,
    query,
  });
}

async function runDoctorPatientInference({
  actor,
  doctorId,
  patientId,
  query = {},
  inferenceType,
  requestContext = 'doctor_dashboard',
}) {
  const payloadResult = await getReadyDoctorPayloadResult({ actor, doctorId, patientId, query });
  return runInference({
    actor,
    patientId,
    inferenceType,
    requestContext,
    payloadResult,
    query,
  });
}

async function getDoctorDashboardPatientMlReadiness({ actor, doctorId, patientId, query = {} }) {
  const payloadResult = await getDoctorPayloadResult({ actor, doctorId, patientId, query });
  return toReadiness(payloadResult);
}

async function getDoctorDashboardPatientMlPayload({ actor, doctorId, patientId, query = {} }) {
  const payloadResult = await getDoctorPayloadResult({ actor, doctorId, patientId, query });
  return toPayloadResponse(payloadResult);
}

async function getPatientMlPredictions(args) {
  return runPatientInference({
    ...args,
    inferenceType: INFERENCE_TYPES.prediction,
  });
}

async function getPatientMlRecommendations(args) {
  return runPatientInference({
    ...args,
    inferenceType: INFERENCE_TYPES.recommendation,
  });
}

async function getDoctorDashboardPatientMlPredictions(args) {
  return runDoctorPatientInference({
    ...args,
    inferenceType: INFERENCE_TYPES.prediction,
  });
}

async function getDoctorDashboardPatientMlRecommendations(args) {
  return runDoctorPatientInference({
    ...args,
    inferenceType: INFERENCE_TYPES.recommendation,
  });
}

async function getPatientLatestMlPrediction({ actor, userId }) {
  return getLatestPatientInferenceResult({
    actor,
    patientId: userId,
    inferenceType: INFERENCE_TYPES.prediction,
  });
}

async function getPatientLatestMlRecommendation({ actor, userId }) {
  return getLatestPatientInferenceResult({
    actor,
    patientId: userId,
    inferenceType: INFERENCE_TYPES.recommendation,
  });
}

async function listPatientMlPredictionHistory({ actor, userId, query = {} }) {
  return listPatientInferenceResults({
    actor,
    patientId: userId,
    inferenceType: INFERENCE_TYPES.prediction,
    query,
  });
}

async function listPatientMlRecommendationHistory({ actor, userId, query = {} }) {
  return listPatientInferenceResults({
    actor,
    patientId: userId,
    inferenceType: INFERENCE_TYPES.recommendation,
    query,
  });
}

async function getPatientMlPredictionHistoryDetail({ actor, userId, resultId }) {
  return getPatientInferenceResultDetail({
    actor,
    patientId: userId,
    inferenceType: INFERENCE_TYPES.prediction,
    resultId,
  });
}

async function getPatientMlRecommendationHistoryDetail({ actor, userId, resultId }) {
  return getPatientInferenceResultDetail({
    actor,
    patientId: userId,
    inferenceType: INFERENCE_TYPES.recommendation,
    resultId,
  });
}

async function getDoctorDashboardPatientLatestMlPrediction({ actor, doctorId, patientId }) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return getLatestPatientInferenceResult({
    actor,
    patientId,
    inferenceType: INFERENCE_TYPES.prediction,
  });
}

async function getDoctorDashboardPatientLatestMlRecommendation({ actor, doctorId, patientId }) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return getLatestPatientInferenceResult({
    actor,
    patientId,
    inferenceType: INFERENCE_TYPES.recommendation,
  });
}

async function listDoctorDashboardPatientMlPredictionHistory({
  actor,
  doctorId,
  patientId,
  query = {},
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return listPatientInferenceResults({
    actor,
    patientId,
    inferenceType: INFERENCE_TYPES.prediction,
    query,
  });
}

async function listDoctorDashboardPatientMlRecommendationHistory({
  actor,
  doctorId,
  patientId,
  query = {},
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return listPatientInferenceResults({
    actor,
    patientId,
    inferenceType: INFERENCE_TYPES.recommendation,
    query,
  });
}

async function getDoctorDashboardPatientMlPredictionHistoryDetail({
  actor,
  doctorId,
  patientId,
  resultId,
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return getPatientInferenceResultDetail({
    actor,
    patientId,
    inferenceType: INFERENCE_TYPES.prediction,
    resultId,
  });
}

async function getDoctorDashboardPatientMlRecommendationHistoryDetail({
  actor,
  doctorId,
  patientId,
  resultId,
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return getPatientInferenceResultDetail({
    actor,
    patientId,
    inferenceType: INFERENCE_TYPES.recommendation,
    resultId,
  });
}

module.exports = {
  getPatientMlReadiness,
  getPatientMlPayload,
  getPatientMlPredictions,
  getPatientMlRecommendations,
  getDoctorDashboardPatientMlReadiness,
  getDoctorDashboardPatientMlPayload,
  getDoctorDashboardPatientMlPredictions,
  getDoctorDashboardPatientMlRecommendations,
  getPatientLatestMlPrediction,
  getPatientLatestMlRecommendation,
  listPatientMlPredictionHistory,
  listPatientMlRecommendationHistory,
  getPatientMlPredictionHistoryDetail,
  getPatientMlRecommendationHistoryDetail,
  getDoctorDashboardPatientLatestMlPrediction,
  getDoctorDashboardPatientLatestMlRecommendation,
  listDoctorDashboardPatientMlPredictionHistory,
  listDoctorDashboardPatientMlRecommendationHistory,
  getDoctorDashboardPatientMlPredictionHistoryDetail,
  getDoctorDashboardPatientMlRecommendationHistoryDetail,
};
