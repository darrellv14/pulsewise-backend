const prisma = require('../../config/prisma');

const CACHE_TTL_SECONDS = 60;
const CACHE_SWR_SECONDS = 120;

function sanitizeCacheTagPart(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .slice(0, 48);
}

function buildMedicationCacheTags({ userId, medicationId }) {
  const safeUserId = sanitizeCacheTagPart(userId);
  const tags = [`medications_user_${safeUserId}`];

  if (medicationId) {
    const safeMedicationId = sanitizeCacheTagPart(medicationId);
    tags.push(`medication_item_${safeMedicationId}`, `reminders_medication_${safeMedicationId}`);
  }

  return tags;
}

function buildCacheStrategy(tags) {
  if (!prisma.$accelerate) {
    return null;
  }

  return {
    ttl: CACHE_TTL_SECONDS,
    swr: CACHE_SWR_SECONDS,
    tags,
  };
}

function withOptionalCacheStrategy(queryArgs, tags) {
  const cacheStrategy = buildCacheStrategy(tags);
  if (!cacheStrategy) {
    return queryArgs;
  }

  return {
    ...queryArgs,
    cacheStrategy,
  };
}

async function invalidateCacheTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return;
  }

  await prisma.$accelerate?.invalidate({
    tags,
  });
}

module.exports = {
  buildMedicationCacheTags,
  withOptionalCacheStrategy,
  invalidateCacheTags,
};
