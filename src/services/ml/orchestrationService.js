const { requestMlEndpoint } = require('./transportService');
const { getStrictMlPayload, ensureMlReady, toReadiness } = require('./payloadService');
const {
  INFERENCE_TYPES,
  assertPatientRouteAccess,
  assertDoctorDashboardRouteAccess,
  resolveInferenceLabels,
} = require('./shared');
const {
  saveInferenceResult,
  getLatestPatientInferenceResult,
  listPatientInferenceResults,
} = require('./historyService');

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

async function runPatientInference({
  actor,
  userId,
  query = {},
  inferenceType,
  requestContext = 'patient',
}) {
  await assertPatientRouteAccess({ actor, userId });
  const payloadResult = await getStrictMlPayload({ userId, endDate: query.date || null });
  ensureMlReady(payloadResult);

  const labels = resolveInferenceLabels(inferenceType);
  const upstream = await requestMlEndpoint({
    endpointPath: labels.endpointPath,
    payload: payloadResult.payload,
  });

  const saved = await saveInferenceResult({
    actor,
    patientId: userId,
    inferenceType,
    requestContext,
    payloadResult,
    upstream,
    includePayload: Boolean(query.includePayload),
  });

  const responseData = {
    resultId: saved.resultId,
    generatedAt: saved.generatedAt,
    mlVersion: payloadResult.mlVersion,
    window: payloadResult.window,
    payloadHash: payloadResult.payloadHash,
    sourceSummary: payloadResult.sourceSummary,
    upstream,
  };

  if (query.includePayload) {
    responseData.payload = payloadResult.payload;
  }

  return responseData;
}

async function runDoctorPatientInference({
  actor,
  doctorId,
  patientId,
  query = {},
  inferenceType,
  requestContext = 'doctor_dashboard',
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const payloadResult = await getStrictMlPayload({ userId: patientId, endDate: query.date || null });
  ensureMlReady(payloadResult);

  const labels = resolveInferenceLabels(inferenceType);
  const upstream = await requestMlEndpoint({
    endpointPath: labels.endpointPath,
    payload: payloadResult.payload,
  });

  const saved = await saveInferenceResult({
    actor,
    patientId,
    inferenceType,
    requestContext,
    payloadResult,
    upstream,
    includePayload: Boolean(query.includePayload),
  });

  const responseData = {
    resultId: saved.resultId,
    generatedAt: saved.generatedAt,
    mlVersion: payloadResult.mlVersion,
    window: payloadResult.window,
    payloadHash: payloadResult.payloadHash,
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
  getDoctorDashboardPatientLatestMlPrediction,
  getDoctorDashboardPatientLatestMlRecommendation,
  listDoctorDashboardPatientMlPredictionHistory,
  listDoctorDashboardPatientMlRecommendationHistory,
};
