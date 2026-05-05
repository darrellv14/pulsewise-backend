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

function touch() {
  metrics.lastOperationAt = new Date().toISOString();
}

function increment(counterName, amount = 1) {
  metrics[counterName] = (metrics[counterName] || 0) + amount;
  touch();
}

function incrementBackend(backendName) {
  metrics.backends[backendName] = (metrics.backends[backendName] || 0) + 1;
  touch();
}

function getMetricsSnapshot() {
  return {
    ...metrics,
    backends: {
      ...metrics.backends,
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
}

module.exports = {
  increment,
  incrementBackend,
  getMetricsSnapshot,
  resetMetrics,
};
