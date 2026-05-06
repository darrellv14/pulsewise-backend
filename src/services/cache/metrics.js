const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidationsExact: 0,
  invalidationsPrefix: 0,
  backends: {
    redis: 0,
    memory: 0,
  },
  lastOperationAt: null,
};

const WINDOW_MINUTES = 60;
const minuteBuckets = new Map();

function currentMinuteIso(now = new Date()) {
  const value = new Date(now);
  value.setUTCSeconds(0, 0);
  return value.toISOString();
}

function ensureBucket(minuteIso) {
  if (!minuteBuckets.has(minuteIso)) {
    minuteBuckets.set(minuteIso, {
      minute: minuteIso,
      hits: 0,
      misses: 0,
      sets: 0,
      invalidationsExact: 0,
      invalidationsPrefix: 0,
    });
  }

  return minuteBuckets.get(minuteIso);
}

function pruneBuckets(now = new Date()) {
  const threshold = new Date(now);
  threshold.setUTCMinutes(threshold.getUTCMinutes() - WINDOW_MINUTES);

  for (const minuteIso of minuteBuckets.keys()) {
    if (new Date(minuteIso).getTime() < threshold.getTime()) {
      minuteBuckets.delete(minuteIso);
    }
  }
}

function touch() {
  metrics.lastOperationAt = new Date().toISOString();
  pruneBuckets();
}

function incrementWindowCounter(counterName, amount = 1) {
  const bucket = ensureBucket(currentMinuteIso());
  bucket[counterName] = (bucket[counterName] || 0) + amount;
}

function increment(counterName, amount = 1) {
  metrics[counterName] = (metrics[counterName] || 0) + amount;
  incrementWindowCounter(counterName, amount);
  touch();
}

function incrementBackend(backendName) {
  metrics.backends[backendName] = (metrics.backends[backendName] || 0) + 1;
  touch();
}

function getMetricsSnapshot() {
  pruneBuckets();
  const requests = metrics.hits + metrics.misses;
  const hitRate = requests > 0 ? Number((metrics.hits / requests).toFixed(4)) : null;
  const last60Minutes = Array.from(minuteBuckets.values())
    .sort((left, right) => new Date(left.minute).getTime() - new Date(right.minute).getTime())
    .map((bucket) => {
      const bucketRequests = bucket.hits + bucket.misses;
      return {
        ...bucket,
        requests: bucketRequests,
        hitRate: bucketRequests > 0 ? Number((bucket.hits / bucketRequests).toFixed(4)) : null,
      };
    });
  const windowRequests = last60Minutes.reduce((sum, bucket) => sum + bucket.requests, 0);
  const windowHits = last60Minutes.reduce((sum, bucket) => sum + bucket.hits, 0);

  return {
    ...metrics,
    requests,
    hitRate,
    backends: {
      ...metrics.backends,
    },
    windows: {
      last60Minutes,
      hitRate:
        windowRequests > 0 ? Number((windowHits / windowRequests).toFixed(4)) : null,
    },
  };
}

function resetMetrics() {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.sets = 0;
  metrics.invalidationsExact = 0;
  metrics.invalidationsPrefix = 0;
  metrics.backends.redis = 0;
  metrics.backends.memory = 0;
  metrics.lastOperationAt = null;
  minuteBuckets.clear();
}

module.exports = {
  increment,
  incrementBackend,
  getMetricsSnapshot,
  resetMetrics,
};
