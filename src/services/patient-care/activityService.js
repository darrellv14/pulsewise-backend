const { NOT_FOUND } = require('../../constants/httpStatus');
const patientCareRepository = require('../../repositories/patientCareRepository');
const { createHttpError } = require('../../utils/httpError');
const { assertUserScope, normalizeNullableText } = require('./shared');
const { invalidateDiaryCache } = require('./cache');
const { ensureHeartDiaryByDate } = require('./diaryService');
const { mapActivity } = require('./mappers');

async function createDailyActivity({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await patientCareRepository.createDailyActivity({
    diaryId,
    name: payload.name,
    activityCategory: normalizeNullableText(payload.activityCategory),
    intensityLevel: normalizeNullableText(payload.intensityLevel),
    transportMode: normalizeNullableText(payload.transportMode),
    outdoorMinutes: payload.outdoorMinutes,
    duration: payload.duration,
    heartRate: payload.heartRate,
    userFeeling: payload.userFeeling || null,
    note: payload.note || null,
    timeStamp: payload.timeStamp || null,
  });

  await invalidateDiaryCache(userId);
  return mapActivity(created);
}

async function createDailyActivityByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const created = await patientCareRepository.createDailyActivity({
    diaryId: diary.diary_id,
    name: payload.name,
    activityCategory: normalizeNullableText(payload.activityCategory),
    intensityLevel: normalizeNullableText(payload.intensityLevel),
    transportMode: normalizeNullableText(payload.transportMode),
    outdoorMinutes: payload.outdoorMinutes,
    duration: payload.duration,
    heartRate: payload.heartRate,
    userFeeling: payload.userFeeling || null,
    note: payload.note || null,
    timeStamp: payload.timeStamp || null,
  });

  await invalidateDiaryCache(userId);
  return mapActivity(created);
}

module.exports = {
  createDailyActivity,
  createDailyActivityByDate,
};
