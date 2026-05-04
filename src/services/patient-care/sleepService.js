const patientCareRepository = require('../../repositories/patientCareRepository');
const { assertUserScope, hasOwn, normalizeNullableText } = require('./shared');
const { invalidateDiaryCache } = require('./cache');
const { ensureHeartDiaryByDate } = require('./diaryService');
const { mapSleepRecord } = require('./mappers');

async function getDailySleepRecordByDate({ actor, userId, diaryDate }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiaryByDate({ userId, diaryDate });
  if (!diary) {
    return null;
  }

  const sleepRecord = await patientCareRepository.getDailySleepRecord(diary.diary_id);
  return mapSleepRecord(sleepRecord);
}

async function upsertDailySleepRecordByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const sleepRecord = await patientCareRepository.upsertDailySleepRecord({
    diaryId: diary.diary_id,
    sleepTime: hasOwn(payload, 'sleepTime') ? payload.sleepTime || null : undefined,
    wakeTime: hasOwn(payload, 'wakeTime') ? payload.wakeTime || null : undefined,
    sleepDurationHours: hasOwn(payload, 'sleepDurationHours')
      ? payload.sleepDurationHours
      : undefined,
    source: hasOwn(payload, 'source') ? normalizeNullableText(payload.source) : undefined,
  });

  await invalidateDiaryCache(userId);
  return mapSleepRecord(sleepRecord);
}

module.exports = {
  getDailySleepRecordByDate,
  upsertDailySleepRecordByDate,
};
