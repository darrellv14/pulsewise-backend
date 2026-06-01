const patientMlInferenceRepository = require('../../repositories/patientMlInferenceRepository');
const { sendMlResultReadyNotificationBestEffort } = require('../notification/domainNotificationService');
const {
  assertPatientResourceAccess,
} = require('../shared/guards');
const { ensureLatestResult, ensureHistoryDetailResult } = require('./shared');

async function saveInferenceResult({
  actor,
  patientId,
  inferenceType,
  modelKey = 'hfms',
  requestContext,
  payloadResult,
  upstream,
  includePayload = false,
}) {
  const saved = await patientMlInferenceRepository.createInferenceResult({
    patientId,
    requestedByUserId: actor?.userId || null,
    payload: {
      modelKey: payloadResult.modelKey || modelKey,
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

  await sendMlResultReadyNotificationBestEffort({
    patientId,
    requestedByUserId: actor?.userId || null,
    result: saved,
    inferenceType,
  });

  return saved;
}

async function getLatestPatientInferenceResult({ actor, patientId, inferenceType, modelKey = 'hfms' }) {
  await assertPatientResourceAccess({ actor, patientId });
  const result = await patientMlInferenceRepository.getLatestInferenceResult({
    patientId,
    modelKey,
    inferenceType,
  });
  return ensureLatestResult(result, inferenceType);
}

async function listPatientInferenceResults({
  actor,
  patientId,
  inferenceType,
  modelKey = 'hfms',
  query,
}) {
  await assertPatientResourceAccess({ actor, patientId });
  return patientMlInferenceRepository.listInferenceResults({
    patientId,
    modelKey,
    inferenceType,
    query,
  });
}

async function getPatientInferenceResultDetail({
  actor,
  patientId,
  inferenceType,
  resultId,
  modelKey = 'hfms',
}) {
  await assertPatientResourceAccess({ actor, patientId });
  const result = await patientMlInferenceRepository.getInferenceResultById({
    patientId,
    modelKey,
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
