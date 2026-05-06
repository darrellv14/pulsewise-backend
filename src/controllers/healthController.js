const { healthCheck } = require('../config/database');
const { getRedisRuntimeStatus } = require('../config/redis');
const { getCacheMetricsSnapshot } = require('../services/cache/cacheService');
const { buildMetricsLines } = require('../services/cache/exporter');
const { success } = require('../utils/response');

async function health(req, res, next) {
  try {
    const db = await healthCheck();
    return success(res, 'Pulse Wise Backend is running smoothly', {
      timestamp: new Date().toISOString(),
      dbTime: db.db_time,
      redis: getRedisRuntimeStatus(),
      cache: getCacheMetricsSnapshot(),
    });
  } catch (error) {
    error.statusCode = 500;
    return next(error);
  }
}

function metrics(req, res) {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(buildMetricsLines());
}

module.exports = {
  health,
  metrics,
};
