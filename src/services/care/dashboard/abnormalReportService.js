const {
  env,
  dashboardRepository,
  getOrSetJson,
  dashboardPatientAbnormalReportKey,
  NOT_FOUND,
  assertDoctorScope,
  createHttpError,
  formatPatientIdentity,
  extractNumberValues,
  aggregateStats,
  thresholds,
  buildPeriodRange,
  mergeSeries,
  buildAbnormalInstances,
} = require('./shared');

async function getDoctorDashboardAbnormalReport({ actor, doctorId, patientId, query }) {
  assertDoctorScope({ actor, doctorId });

  return getOrSetJson(
    dashboardPatientAbnormalReportKey({ doctorId, patientId, query: query || {} }),
    env.cache.dashboardAbnormalReportTtlSeconds,
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
  );
}

module.exports = {
  getDoctorDashboardAbnormalReport,
};
