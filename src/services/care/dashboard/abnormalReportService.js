const {
  env,
  dashboardRepository,
  getOrSetJson,
  dashboardPatientAbnormalReportKey,
  patientSelfDashboardAbnormalReportKey,
  NOT_FOUND,
  assertDoctorScope,
  assertPatientScope,
  createHttpError,
  formatPatientIdentity,
  extractNumberValues,
  aggregateStats,
  thresholds,
  buildPeriodRange,
  mergeSeries,
  buildAbnormalInstances,
} = require('./shared');

async function buildDashboardAbnormalReport(patientId, query, identityLoader, notFoundMessage) {
  const identity = await identityLoader();
  if (!identity) {
    throw createHttpError(notFoundMessage, NOT_FOUND);
  }

  const period = buildPeriodRange(query);

  const [dailyRows, vitalRows] = await Promise.all([
    dashboardRepository.listDailyMetricsSeries({
      patientId,
      startAt: period.startAt,
      endAt: period.endAt,
    }),
    dashboardRepository.listVitalReadingSeries({
      patientId,
      startAt: period.startAt,
      endAt: period.endAt,
    }),
  ]);

  const merged = mergeSeries({ dailyRows, vitalRows });

  const stats = {
    systolicBp: aggregateStats(extractNumberValues(merged.points, 'systolicBp')),
    diastolicBp: aggregateStats(extractNumberValues(merged.points, 'diastolicBp')),
    heartRate: aggregateStats(extractNumberValues(merged.points, 'heartRate')),
    oxygenSaturation: aggregateStats(extractNumberValues(merged.points, 'oxygenSaturation')),
    weight: aggregateStats(extractNumberValues(merged.points, 'weight')),
    bmi: aggregateStats(extractNumberValues(merged.points, 'bmi')),
  };

  return {
    patient: formatPatientIdentity(identity),
    period,
    stats,
    abnormalInstances: buildAbnormalInstances(merged.points),
    thresholds,
  };
}

async function getDoctorDashboardAbnormalReport({ actor, doctorId, patientId, query }) {
  assertDoctorScope({ actor, doctorId });

  return getOrSetJson(
    dashboardPatientAbnormalReportKey({ doctorId, patientId, query: query || {} }),
    env.cache.dashboardAbnormalReportTtlSeconds,
    () =>
      buildDashboardAbnormalReport(
        patientId,
        query,
        () => dashboardRepository.getDoctorPatientIdentity({ doctorId, patientId }),
        'Data pasien dokter tidak ditemukan'
      )
  );
}

async function getPatientSelfDashboardAbnormalReport({ actor, userId, query }) {
  assertPatientScope({ actor, patientId: userId });

  return getOrSetJson(
    patientSelfDashboardAbnormalReportKey({ userId, query: query || {} }),
    env.cache.dashboardAbnormalReportTtlSeconds,
    () =>
      buildDashboardAbnormalReport(
        userId,
        query,
        () => dashboardRepository.getPatientIdentity(userId),
        'Data dashboard pasien tidak ditemukan'
      )
  );
}

module.exports = {
  getDoctorDashboardAbnormalReport,
  getPatientSelfDashboardAbnormalReport,
};
