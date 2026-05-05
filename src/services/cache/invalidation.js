const { invalidateByPrefixes } = require('./cacheService');
const {
  dashboardPatientsListPrefix,
  dashboardPatientSummaryPrefix,
  dashboardPatientVitalsPrefix,
  dashboardPatientAbnormalReportPrefix,
  diaryByDatePrefix,
  sleepByDatePrefix,
} = require('./cacheKeys');

async function invalidateDashboardPatientCaches(patientId, options = {}) {
  const includePatientsList = options.includePatientsList !== false;
  const prefixes = [
    dashboardPatientSummaryPrefix(patientId),
    dashboardPatientVitalsPrefix(patientId),
    dashboardPatientAbnormalReportPrefix(patientId),
  ];

  if (includePatientsList) {
    prefixes.push(dashboardPatientsListPrefix());
  }

  await invalidateByPrefixes(prefixes);
}

async function invalidatePatientDiaryCaches(userId) {
  await invalidateByPrefixes([diaryByDatePrefix(userId), sleepByDatePrefix(userId)]);
}

async function invalidatePatientCareAndDashboardCaches(userId) {
  await invalidateByPrefixes([
    diaryByDatePrefix(userId),
    sleepByDatePrefix(userId),
    dashboardPatientsListPrefix(),
    dashboardPatientSummaryPrefix(userId),
    dashboardPatientVitalsPrefix(userId),
    dashboardPatientAbnormalReportPrefix(userId),
  ]);
}

module.exports = {
  invalidateDashboardPatientCaches,
  invalidatePatientDiaryCaches,
  invalidatePatientCareAndDashboardCaches,
};
