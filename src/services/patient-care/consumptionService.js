const { NOT_FOUND } = require('../../constants/httpStatus');
const patientCareRepository = require('../../repositories/patientCareRepository');
const { createHttpError } = require('../../utils/httpError');
const { assertUserScope, normalizeNullableText, resolveDiaryEntryTimestamp } = require('./shared');
const { invalidateDiaryCache } = require('./cache');
const { ensureHeartDiaryByDate } = require('./diaryService');
const { mapConsumption } = require('./mappers');

async function createDailyConsumption({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await patientCareRepository.createDailyConsumption({
    diaryId,
    type: payload.type || null,
    name: payload.name || null,
    portion: payload.portion || null,
    portionGrams: payload.portionGrams,
    fdcFoodId: normalizeNullableText(payload.fdcFoodId),
    nutritionSource: normalizeNullableText(payload.nutritionSource),
    energyKcal: payload.energyKcal,
    proteinG: payload.proteinG,
    carbohydrateG: payload.carbohydrateG,
    sugarG: payload.sugarG,
    fiberG: payload.fiberG,
    totalFatG: payload.totalFatG,
    saturatedFatG: payload.saturatedFatG,
    monounsaturatedFatG: payload.monounsaturatedFatG,
    polyunsaturatedFatG: payload.polyunsaturatedFatG,
    cholesterolMg: payload.cholesterolMg,
    calciumMg: payload.calciumMg,
    note: payload.note || null,
    timeStamp: payload.timeStamp || null,
  });

  await invalidateDiaryCache(userId);
  return mapConsumption(created);
}

async function createDailyConsumptionByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const created = await patientCareRepository.createDailyConsumption({
    diaryId: diary.diary_id,
    type: normalizeNullableText(payload.type),
    name: normalizeNullableText(payload.name),
    portion: normalizeNullableText(payload.portion),
    portionGrams: payload.portionGrams,
    fdcFoodId: normalizeNullableText(payload.fdcFoodId),
    nutritionSource: normalizeNullableText(payload.nutritionSource),
    energyKcal: payload.energyKcal,
    proteinG: payload.proteinG,
    carbohydrateG: payload.carbohydrateG,
    sugarG: payload.sugarG,
    fiberG: payload.fiberG,
    totalFatG: payload.totalFatG,
    saturatedFatG: payload.saturatedFatG,
    monounsaturatedFatG: payload.monounsaturatedFatG,
    polyunsaturatedFatG: payload.polyunsaturatedFatG,
    cholesterolMg: payload.cholesterolMg,
    calciumMg: payload.calciumMg,
    note: normalizeNullableText(payload.note),
    timeStamp: resolveDiaryEntryTimestamp({
      diaryDate: payload.diaryDate,
      time: payload.time,
      timeStamp: payload.timeStamp,
    }),
  });

  await invalidateDiaryCache(userId);
  return mapConsumption(created);
}

module.exports = {
  createDailyConsumption,
  createDailyConsumptionByDate,
};
