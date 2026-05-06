const { getStrictMlPayload, ensureMlReady, toReadiness } = require('./payloadService');
const { assertPatientRouteAccess, assertDoctorDashboardRouteAccess } = require('./shared');

async function getPatientPayloadResult({ actor, userId, query = {} }) {
  await assertPatientRouteAccess({ actor, userId });
  return getStrictMlPayload({ userId, endDate: query.date || null });
}

async function getDoctorPayloadResult({ actor, doctorId, patientId, query = {} }) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return getStrictMlPayload({ userId: patientId, endDate: query.date || null });
}

async function getReadyPatientPayloadResult(args) {
  const payloadResult = await getPatientPayloadResult(args);
  ensureMlReady(payloadResult);
  return payloadResult;
}

async function getReadyDoctorPayloadResult(args) {
  const payloadResult = await getDoctorPayloadResult(args);
  ensureMlReady(payloadResult);
  return payloadResult;
}

function toPayloadResponse(payloadResult) {
  return {
    ready: payloadResult.missingFields.length === 0,
    missingFields: payloadResult.missingFields,
    resolvedFields: payloadResult.resolvedFields,
    mlVersion: payloadResult.mlVersion,
    window: payloadResult.window,
    payload: payloadResult.payload,
    sourceSummary: payloadResult.sourceSummary,
  };
}

module.exports = {
  toReadiness,
  assertDoctorDashboardRouteAccess,
  getPatientPayloadResult,
  getDoctorPayloadResult,
  getReadyPatientPayloadResult,
  getReadyDoctorPayloadResult,
  toPayloadResponse,
};
