const {
  env,
  dashboardRepository,
  getOrSetJson,
  dashboardPatientVitalsKey,
  NOT_FOUND,
  assertDoctorScope,
  createHttpError,
  formatPatientIdentity,
  buildLatestVitals,
  thresholds,
  buildPeriodRange,
  mergeSeries,
} = require('./shared');

async function getDoctorDashboardPatientVitals({ actor, doctorId, patientId, query }) {
  assertDoctorScope({ actor, doctorId });

  return getOrSetJson(
    dashboardPatientVitalsKey({ doctorId, patientId, query: query || {} }),
    env.cache.dashboardVitalsTtlSeconds,
    async () => {
      const identity = await dashboardRepository.getDoctorPatientIdentity({ doctorId, patientId });
      if (!identity) {
        throw createHttpError('Data pasien dokter tidak ditemukan', NOT_FOUND);
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
  );
}

module.exports = {
  getDoctorDashboardPatientVitals,
};
