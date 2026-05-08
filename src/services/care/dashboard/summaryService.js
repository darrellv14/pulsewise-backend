const {
  env,
  dashboardRepository,
  getOrSetJson,
  dashboardPatientSummaryKey,
  patientSelfDashboardSummaryKey,
  NOT_FOUND,
  toIso,
  toNumberOrNull,
  assertDoctorScope,
  assertPatientScope,
  createHttpError,
  mapDashboardSummary,
  thresholds,
} = require('./shared');
const { metricTypeToDashboardKey } = require('../../../utils/metricTypes');

async function buildDashboardPatientSummary(patientId, identityLoader, notFoundMessage) {
  const identity = await identityLoader();
  if (!identity) {
    throw createHttpError(notFoundMessage, NOT_FOUND);
  }

  const [latestDaily, latestVitalSnapshot] = await Promise.all([
    dashboardRepository.getLatestDailyMetrics(patientId),
    dashboardRepository.getLatestVitalSnapshot(patientId),
  ]);

  const latestVitals = {
    measuredAt: toIso(latestDaily?.measured_at),
    systolicBp: toNumberOrNull(latestDaily?.systolic_bp),
    diastolicBp: toNumberOrNull(latestDaily?.diastolic_bp),
    heartRate: null,
    oxygenSaturation: null,
    weight: toNumberOrNull(latestDaily?.weight),
    height: toNumberOrNull(latestDaily?.height),
    bmi: toNumberOrNull(latestDaily?.bmi),
  };

  for (const reading of latestVitalSnapshot) {
    const key = metricTypeToDashboardKey(reading.metric_type);
    if (!key) {
      continue;
    }

    latestVitals[key] = toNumberOrNull(reading.value_numeric);

    const measuredAt = toIso(reading.measured_at);
    if (!latestVitals.measuredAt || (measuredAt && measuredAt > latestVitals.measuredAt)) {
      latestVitals.measuredAt = measuredAt;
    }
  }

  return mapDashboardSummary({
    identity,
    latestVitals,
    thresholds,
  });
}

async function getDoctorDashboardPatientSummary({ actor, doctorId, patientId }) {
  assertDoctorScope({ actor, doctorId });

  return getOrSetJson(
    dashboardPatientSummaryKey({ doctorId, patientId }),
    env.cache.dashboardSummaryTtlSeconds,
    () =>
      buildDashboardPatientSummary(
        patientId,
        () => dashboardRepository.getDoctorPatientIdentity({ doctorId, patientId }),
        'Data pasien dokter tidak ditemukan'
      )
  );
}

async function getPatientSelfDashboardSummary({ actor, userId }) {
  assertPatientScope({ actor, patientId: userId });

  return getOrSetJson(
    patientSelfDashboardSummaryKey({ userId }),
    env.cache.dashboardSummaryTtlSeconds,
    () =>
      buildDashboardPatientSummary(
        userId,
        () => dashboardRepository.getPatientIdentity(userId),
        'Data dashboard pasien tidak ditemukan'
      )
  );
}

module.exports = {
  getDoctorDashboardPatientSummary,
  getPatientSelfDashboardSummary,
};
