const patientMlInferenceRepository = require('../../repositories/patientMlInferenceRepository');
const {
  assertPatientResourceAccess,
} = require('../shared/guards');
const { ensureLatestResult, ensureHistoryDetailResult } = require('./shared');

async function saveInferenceResult({
  actor,
  patientId,
  inferenceType,
  requestContext,
  payloadResult,
  upstream,
  includePayload = false,
}) {
  return patientMlInferenceRepository.createInferenceResult({
    patientId,
    requestedByUserId: actor?.userId || null,
    payload: {
      inferenceType,
      requestContext,
      mlVersion: payloadResult.mlVersion,
      payloadHash: payloadResult.payloadHash,
      payload: includePayload ? payloadResult.payload : null,
      sourceSummary: payloadResult.sourceSummary,
      window: payloadResult.window,
      upstream,
      generatedAt: new Date().toISOString(),
    },
  });
}

async function getLatestPatientInferenceResult({ actor, patientId, inferenceType }) {
  await assertPatientResourceAccess({ actor, patientId });
  const result = await patientMlInferenceRepository.getLatestInferenceResult({
    patientId,
    inferenceType,
  });
  return ensureLatestResult(result, inferenceType);
}

async function listPatientInferenceResults({ actor, patientId, inferenceType, query }) {
  await assertPatientResourceAccess({ actor, patientId });
  return patientMlInferenceRepository.listInferenceResults({
    patientId,
    inferenceType,
    query,
  });
}

async function getPatientInferenceResultDetail({ actor, patientId, inferenceType, resultId }) {
  await assertPatientResourceAccess({ actor, patientId });
  const result = await patientMlInferenceRepository.getInferenceResultById({
    patientId,
    inferenceType,
    resultId,
  });
  return ensureHistoryDetailResult(result, inferenceType);
}

module.exports = {
  saveInferenceResult,
  getLatestPatientInferenceResult,
  listPatientInferenceResults,
  getPatientInferenceResultDetail,
};
