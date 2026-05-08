const {
  env,
  dashboardRepository,
  getOrSetJson,
  dashboardPatientVitalsKey,
  patientSelfDashboardVitalsKey,
  NOT_FOUND,
  assertDoctorScope,
  assertPatientScope,
  createHttpError,
  formatPatientIdentity,
  buildLatestVitals,
  thresholds,
  buildPeriodRange,
  mergeSeries,
} = require('./shared');

async function buildDashboardPatientVitals(patientId, query, identityLoader, notFoundMessage) {
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

  return {
    patient: formatPatientIdentity(identity),
    period,
    series: merged.series,
    latestVitals: buildLatestVitals(merged.points),
    thresholds,
  };
}

async function getDoctorDashboardPatientVitals({ actor, doctorId, patientId, query }) {
  assertDoctorScope({ actor, doctorId });

  return getOrSetJson(
    dashboardPatientVitalsKey({ doctorId, patientId, query: query || {} }),
    env.cache.dashboardVitalsTtlSeconds,
    () =>
      buildDashboardPatientVitals(
        patientId,
        query,
        () => dashboardRepository.getDoctorPatientIdentity({ doctorId, patientId }),
        'Data pasien dokter tidak ditemukan'
      )
  );
}

async function getPatientSelfDashboardVitals({ actor, userId, query }) {
  assertPatientScope({ actor, patientId: userId });

  return getOrSetJson(
    patientSelfDashboardVitalsKey({ userId, query: query || {} }),
    env.cache.dashboardVitalsTtlSeconds,
    () =>
      buildDashboardPatientVitals(
        userId,
        query,
        () => dashboardRepository.getPatientIdentity(userId),
        'Data dashboard pasien tidak ditemukan'
      )
  );
}

module.exports = {
  getDoctorDashboardPatientVitals,
  getPatientSelfDashboardVitals,
};
