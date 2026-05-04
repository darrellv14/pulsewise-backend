const { invalidateByPrefixes, getOrSetJson } = require('../cache/cacheService');
const {
  diaryByDateKey,
  diaryByDatePrefix,
  dashboardPatientSummaryPrefix,
  dashboardPatientsListPrefix,
} = require('../cache/cacheKeys');

async function invalidateDiaryCache(userId) {
  await invalidateByPrefixes([diaryByDatePrefix(userId)]);
}

async function invalidateDiaryAndDashboardCaches(userId) {
  await invalidateByPrefixes([
    diaryByDatePrefix(userId),
    dashboardPatientSummaryPrefix(userId),
    dashboardPatientsListPrefix(),
  ]);
}

module.exports = {
  getOrSetJson,
  diaryByDateKey,
  invalidateDiaryCache,
  invalidateDiaryAndDashboardCaches,
};
