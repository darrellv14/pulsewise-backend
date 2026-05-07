const env = require('../../config/env');
const patientCareRepository = require('../../repositories/patientCareRepository');
const { buildPagination, normalizePaginationInput } = require('../../utils/pagination');
const { assertUserScope } = require('./shared');
const { getOrSetJson, diaryByDateKey, invalidateDiaryCache } = require('./cache');
const { mapDiary, mapHeartDiaryDetail } = require('./mappers');

async function upsertHeartDiary({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.upsertHeartDiary({
    userId,
    diaryDate: payload.diaryDate,
  });

  await invalidateDiaryCache(userId);

  return mapDiary(diary);
}

async function listHeartDiaries({ actor, userId, query }) {
  assertUserScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const offset = (page - 1) * limit;

  const result = await patientCareRepository.listHeartDiaries({
    userId,
    startDate: query?.startDate,
    endDate: query?.endDate,
    limit,
    offset,
  });

  return {
    items: result.items.map(mapDiary),
    pagination: buildPagination({ page, limit, totalItems: result.totalItems }),
  };
}

async function getHeartDiaryByDate({ actor, userId, diaryDate }) {
  assertUserScope({ actor, userId });

  return getOrSetJson(
    diaryByDateKey({ userId, diaryDate }),
    env.cache.diaryByDateTtlSeconds,
    async () => {
      const diary = await patientCareRepository.getHeartDiaryByDate({ userId, diaryDate });
      if (!diary) {
        return null;
      }

      return mapHeartDiaryDetail(diary);
    }
  );
}

async function ensureHeartDiaryByDate({ userId, diaryDate }) {
  return patientCareRepository.upsertHeartDiary({
    userId,
    diaryDate,
  });
}

module.exports = {
  upsertHeartDiary,
  listHeartDiaries,
  getHeartDiaryByDate,
  ensureHeartDiaryByDate,
};
