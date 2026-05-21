const { getRedisClient } = require('../../config/redis');
const env = require('../../config/env');

const memoryBuckets = new Map();

function getConfiguredModels() {
  const models = env.nutritionEstimation.models?.length
    ? env.nutritionEstimation.models
    : [env.nutritionEstimation.model].filter(Boolean);

  return [...new Set(models)];
}

function getPacificDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function getMinuteBucket(now = new Date()) {
  return now.toISOString().slice(0, 16);
}

function getMemoryBucket(key, ttlMs) {
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || existing.expiresAt <= now) {
    const fresh = { count: 0, expiresAt: now + ttlMs };
    memoryBuckets.set(key, fresh);
    return fresh;
  }

  return existing;
}

function buildKeys(model, now = new Date()) {
  return {
    minuteKey: `nutrition:gemini:${model}:minute:${getMinuteBucket(now)}`,
    dayKey: `nutrition:gemini:${model}:day:${getPacificDateKey(now)}`,
  };
}

async function getCounts(model, now = new Date()) {
  const client = await getRedisClient();
  const { minuteKey, dayKey } = buildKeys(model, now);

  if (client) {
    const [minuteCount, dayCount] = await client.mGet([minuteKey, dayKey]);
    return {
      minuteCount: Number(minuteCount || 0),
      dayCount: Number(dayCount || 0),
      backend: 'redis',
    };
  }

  const minuteBucket = getMemoryBucket(minuteKey, 60_000);
  const dayBucket = getMemoryBucket(dayKey, 48 * 60 * 60 * 1000);
  return {
    minuteCount: minuteBucket.count,
    dayCount: dayBucket.count,
    backend: 'memory',
  };
}

async function reserveQuota(model, now = new Date()) {
  const client = await getRedisClient();
  const { minuteKey, dayKey } = buildKeys(model, now);
  const minuteLimit = env.nutritionEstimation.maxRequestsPerMinutePerModel;
  const dayLimit = env.nutritionEstimation.maxRequestsPerDayPerModel;

  if (client) {
    const multi = client.multi();
    multi.incr(minuteKey);
    multi.pExpire(minuteKey, 60_000);
    multi.incr(dayKey);
    multi.pExpire(dayKey, 48 * 60 * 60 * 1000);
    const [minuteCount, _minuteExpire, dayCount] = await multi.exec();

    return {
      allowed: Number(minuteCount) <= minuteLimit && Number(dayCount) <= dayLimit,
      minuteCount: Number(minuteCount),
      dayCount: Number(dayCount),
      backend: 'redis',
    };
  }

  const minuteBucket = getMemoryBucket(minuteKey, 60_000);
  const dayBucket = getMemoryBucket(dayKey, 48 * 60 * 60 * 1000);
  minuteBucket.count += 1;
  dayBucket.count += 1;

  return {
    allowed: minuteBucket.count <= minuteLimit && dayBucket.count <= dayLimit,
    minuteCount: minuteBucket.count,
    dayCount: dayBucket.count,
    backend: 'memory',
  };
}

async function acquireModelQuota(options = {}) {
  const excludedModels = new Set(options.excludedModels || []);
  const models = getConfiguredModels();
  const now = new Date();
  const usage = [];

  for (const model of models) {
    if (excludedModels.has(model)) {
      continue;
    }

    const counts = await getCounts(model, now);
    usage.push({
      model,
      minuteCount: counts.minuteCount,
      minuteLimit: env.nutritionEstimation.maxRequestsPerMinutePerModel,
      dayCount: counts.dayCount,
      dayLimit: env.nutritionEstimation.maxRequestsPerDayPerModel,
      backend: counts.backend,
    });

    if (
      counts.minuteCount >= env.nutritionEstimation.maxRequestsPerMinutePerModel ||
      counts.dayCount >= env.nutritionEstimation.maxRequestsPerDayPerModel
    ) {
      continue;
    }

    const reservation = await reserveQuota(model, now);
    if (reservation.allowed) {
      return {
        model,
        usage,
      };
    }
  }

  return {
    model: null,
    usage,
  };
}

function resetGeminiQuotaStateForTests() {
  memoryBuckets.clear();
}

module.exports = {
  acquireModelQuota,
  getConfiguredModels,
  resetGeminiQuotaStateForTests,
};
