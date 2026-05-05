const buckets = new Map();
const { getRedisClient } = require('../config/redis');

function pruneExpired(now) {
  for (const [key, value] of buckets.entries()) {
    if (value.expiresAt <= now) {
      buckets.delete(key);
    }
  }
}

function getClientKey(req, name) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedKey = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : null;
  const ip = forwardedKey || req.ip || req.socket?.remoteAddress || 'unknown';

  return `${name}:${ip}`;
}

function createRateLimiter({ name, windowMs, max, message }) {
  const scopeName = name || 'global';
  const limitWindowMs = Number(windowMs) > 0 ? Number(windowMs) : 60_000;
  const limitMax = Number(max) > 0 ? Number(max) : 60;

  return async function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = getClientKey(req, scopeName);
    const redisKey = `ratelimit:${key}`;
    const client = await getRedisClient();

    if (client) {
      const bucketCount = await client.incr(redisKey);
      if (bucketCount === 1) {
        await client.pExpire(redisKey, limitWindowMs);
      }

      if (bucketCount > limitMax) {
        const ttlMs = await client.pTTL(redisKey);
        const retryAfterSeconds = Math.max(1, Math.ceil(Math.max(ttlMs, 1000) / 1000));
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          success: false,
          message: message || 'Too many requests',
        });
      }

      return next();
    }

    if (buckets.size > 10_000) {
      pruneExpired(now);
    }

    const existing = buckets.get(key);

    if (!existing || existing.expiresAt <= now) {
      buckets.set(key, {
        count: 1,
        expiresAt: now + limitWindowMs,
      });
      return next();
    }

    existing.count += 1;

    if (existing.count > limitMax) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests',
      });
    }

    return next();
  };
}

module.exports = {
  createRateLimiter,
};
