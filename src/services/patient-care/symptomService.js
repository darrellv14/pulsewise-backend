const { NOT_FOUND } = require('../../constants/httpStatus');
const patientCareRepository = require('../../repositories/patientCareRepository');
const { createHttpError } = require('../../utils/httpError');
const { assertUserScope, normalizeNullableText, resolveDiaryEntryTimestamp } = require('./shared');
const { invalidateDiaryCache } = require('./cache');
const { ensureHeartDiaryByDate } = require('./diaryService');
const { mapSymptom } = require('./mappers');

async function createDailySymptom({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await patientCareRepository.createDailySymptom({
    diaryId,
    symptomName: payload.symptomName,
    symptomCode: normalizeNullableText(payload.symptomCode),
    bodyArea: normalizeNullableText(payload.bodyArea),
    isChestPain: payload.isChestPain ?? null,
    painFrequencyCode: payload.painFrequencyCode,
    painLocationCode: payload.painLocationCode,
    intensity: payload.intensity,
    note: payload.note || null,
    timeStamp: payload.timeStamp || null,
  });

  await invalidateDiaryCache(userId);
  return mapSymptom(created);
}

async function createDailySymptomByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const created = await patientCareRepository.createDailySymptom({
    diaryId: diary.diary_id,
    symptomName: payload.symptomName,
    symptomCode: normalizeNullableText(payload.symptomCode),
    bodyArea: normalizeNullableText(payload.bodyArea),
    isChestPain: payload.isChestPain ?? null,
    painFrequencyCode: payload.painFrequencyCode,
    painLocationCode: payload.painLocationCode,
    intensity: payload.intensity,
    note: normalizeNullableText(payload.note),
    timeStamp: resolveDiaryEntryTimestamp({
      diaryDate: payload.diaryDate,
      time: payload.time,
      timeStamp: payload.timeStamp,
    }),
  });

  await invalidateDiaryCache(userId);
  return mapSymptom(created);
}

module.exports = {
  createDailySymptom,
  createDailySymptomByDate,
};
