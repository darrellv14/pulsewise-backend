const { getCacheMetricsSnapshot } = require('./cacheService');
const { getRedisRuntimeStatus } = require('../../config/redis');

function formatPrometheusValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0';
  }

  return String(value);
}

function buildMetricsLines() {
  const cache = getCacheMetricsSnapshot();
  const redis = getRedisRuntimeStatus();

  const lines = [
    '# HELP pulsewise_cache_hits_total Total cache hits.',
    '# TYPE pulsewise_cache_hits_total counter',
    `pulsewise_cache_hits_total ${formatPrometheusValue(cache.hits)}`,
    '# HELP pulsewise_cache_misses_total Total cache misses.',
    '# TYPE pulsewise_cache_misses_total counter',
    `pulsewise_cache_misses_total ${formatPrometheusValue(cache.misses)}`,
    '# HELP pulsewise_cache_sets_total Total cache set operations.',
    '# TYPE pulsewise_cache_sets_total counter',
    `pulsewise_cache_sets_total ${formatPrometheusValue(cache.sets)}`,
    '# HELP pulsewise_cache_requests_total Total cache lookup requests.',
    '# TYPE pulsewise_cache_requests_total counter',
    `pulsewise_cache_requests_total ${formatPrometheusValue(cache.requests)}`,
    '# HELP pulsewise_cache_hit_rate Cache hit rate across the current process lifetime.',
    '# TYPE pulsewise_cache_hit_rate gauge',
    `pulsewise_cache_hit_rate ${formatPrometheusValue(cache.hitRate)}`,
    '# HELP pulsewise_cache_invalidations_exact_total Total exact cache invalidations.',
    '# TYPE pulsewise_cache_invalidations_exact_total counter',
    `pulsewise_cache_invalidations_exact_total ${formatPrometheusValue(cache.invalidationsExact)}`,
    '# HELP pulsewise_cache_invalidations_prefix_total Total prefix cache invalidations.',
    '# TYPE pulsewise_cache_invalidations_prefix_total counter',
    `pulsewise_cache_invalidations_prefix_total ${formatPrometheusValue(cache.invalidationsPrefix)}`,
    '# HELP pulsewise_cache_backend_operations_total Cache backend operation count by backend.',
    '# TYPE pulsewise_cache_backend_operations_total counter',
    `pulsewise_cache_backend_operations_total{backend="redis"} ${formatPrometheusValue(cache.backends.redis)}`,
    `pulsewise_cache_backend_operations_total{backend="memory"} ${formatPrometheusValue(cache.backends.memory)}`,
    '# HELP pulsewise_cache_last_60m_hit_rate Cache hit rate across the rolling 60-minute window.',
    '# TYPE pulsewise_cache_last_60m_hit_rate gauge',
    `pulsewise_cache_last_60m_hit_rate ${formatPrometheusValue(cache.windows?.hitRate)}`,
    '# HELP pulsewise_redis_enabled Whether Redis integration is enabled.',
    '# TYPE pulsewise_redis_enabled gauge',
    `pulsewise_redis_enabled ${redis.enabled ? '1' : '0'}`,
    '# HELP pulsewise_redis_available Whether Redis is currently available.',
    '# TYPE pulsewise_redis_available gauge',
    `pulsewise_redis_available ${redis.available ? '1' : '0'}`,
    '# HELP pulsewise_redis_backend Which cache backend is active (redis=1, memory=0).',
    '# TYPE pulsewise_redis_backend gauge',
    `pulsewise_redis_backend ${redis.backend === 'redis' ? '1' : '0'}`,
  ];

  return `${lines.join('\n')}\n`;
}

module.exports = {
  buildMetricsLines,
};
