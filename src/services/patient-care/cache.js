const { getOrSetJson } = require('../cache/cacheService');
const { diaryByDateKey, sleepByDateKey } = require('../cache/cacheKeys');
const {
  invalidatePatientDiaryCaches,
  invalidatePatientCareAndDashboardCaches,
} = require('../cache/invalidation');

async function invalidateDiaryCache(userId) {
  await invalidatePatientDiaryCaches(userId);
}

async function invalidateDiaryAndDashboardCaches(userId) {
  await invalidatePatientCareAndDashboardCaches(userId);
}

module.exports = {
  getOrSetJson,
  diaryByDateKey,
  sleepByDateKey,
  invalidateDiaryCache,
  invalidateDiaryAndDashboardCaches,
};
