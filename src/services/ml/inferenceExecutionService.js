const { requestMlEndpoint } = require('./transportService');
const { resolveInferenceLabels } = require('./shared');
const { saveInferenceResult } = require('./historyService');

async function runInference({
  actor,
  patientId,
  query = {},
  inferenceType,
  modelKey = 'hfms',
  requestContext,
  payloadResult,
}) {
  const labels = resolveInferenceLabels(inferenceType);
  const upstream = await requestMlEndpoint({
    endpointPath: labels.endpointPath,
    payload: payloadResult.payload,
  });

  const saved = await saveInferenceResult({
    actor,
    patientId,
    inferenceType,
    modelKey: payloadResult.modelKey || modelKey,
    requestContext,
    payloadResult,
    upstream,
    includePayload: Boolean(query.includePayload),
  });

  const responseData = {
    resultId: saved.resultId,
    generatedAt: saved.generatedAt,
    modelKey: payloadResult.modelKey || modelKey,
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

module.exports = {
  runInference,
};
