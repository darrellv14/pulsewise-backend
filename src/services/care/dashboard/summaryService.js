const {
  env,
  dashboardRepository,
  getOrSetJson,
  dashboardPatientSummaryKey,
  patientSelfDashboardSummaryKey,
  NOT_FOUND,
  toIso,
  toNumberOrNull,
  latestIso,
  buildLatestVitalField,
  assertDoctorScope,
  assertPatientScope,
  createHttpError,
  mapDashboardSummary,
  thresholds,
} = require('./shared');
const { metricTypeToDashboardKey } = require('../../../utils/metricTypes');

function shouldReplaceLatestField(currentMeasuredAt, nextMeasuredAt) {
  if (!nextMeasuredAt) {
    return false;
  }

  if (!currentMeasuredAt) {
    return true;
  }

  return nextMeasuredAt >= currentMeasuredAt;
}

async function buildDashboardPatientSummary(patientId, identityLoader, notFoundMessage) {
  const identity = await identityLoader();
  if (!identity) {
    throw createHttpError(notFoundMessage, NOT_FOUND);
  }

  const [latestDaily, latestVitalSnapshot] = await Promise.all([
    dashboardRepository.getLatestDailyMetrics(patientId),
    dashboardRepository.getLatestVitalSnapshot(patientId),
  ]);

  const dailyMeasuredAt = toIso(latestDaily?.measured_at);
  const latestVitalsByField = {
    systolicBp: buildLatestVitalField(toNumberOrNull(latestDaily?.systolic_bp), dailyMeasuredAt),
    diastolicBp: buildLatestVitalField(
      toNumberOrNull(latestDaily?.diastolic_bp),
      dailyMeasuredAt
    ),
    heartRate: buildLatestVitalField(toNumberOrNull(latestDaily?.heart_rate), dailyMeasuredAt),
    oxygenSaturation: buildLatestVitalField(
      toNumberOrNull(latestDaily?.oxygen_saturation),
      dailyMeasuredAt
    ),
    weight: buildLatestVitalField(toNumberOrNull(latestDaily?.weight), dailyMeasuredAt),
    height: buildLatestVitalField(toNumberOrNull(latestDaily?.height), dailyMeasuredAt),
    bmi: buildLatestVitalField(toNumberOrNull(latestDaily?.bmi), dailyMeasuredAt),
  };

  const latestVitals = {
    measuredAt: dailyMeasuredAt,
    systolicBp: latestVitalsByField.systolicBp.value,
    diastolicBp: latestVitalsByField.diastolicBp.value,
    heartRate: latestVitalsByField.heartRate.value,
    oxygenSaturation: latestVitalsByField.oxygenSaturation.value,
    weight: latestVitalsByField.weight.value,
    height: latestVitalsByField.height.value,
    bmi: latestVitalsByField.bmi.value,
  };

  for (const reading of latestVitalSnapshot) {
    const key = metricTypeToDashboardKey(reading.metric_type);
    if (!key) {
      continue;
    }

    const measuredAt = toIso(reading.measured_at);
    const value = toNumberOrNull(reading.value_numeric);

    if (!shouldReplaceLatestField(latestVitalsByField[key]?.measuredAt, measuredAt)) {
      continue;
    }

    latestVitals[key] = value;
    latestVitalsByField[key] = buildLatestVitalField(value, measuredAt);
  }

  latestVitals.measuredAt = latestIso(
    latestVitalsByField.systolicBp.measuredAt,
    latestVitalsByField.diastolicBp.measuredAt,
    latestVitalsByField.heartRate.measuredAt,
    latestVitalsByField.oxygenSaturation.measuredAt,
    latestVitalsByField.weight.measuredAt,
    latestVitalsByField.height.measuredAt,
    latestVitalsByField.bmi.measuredAt
  );

  return mapDashboardSummary({
    identity,
    latestVitals,
    latestVitalsByField,
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
