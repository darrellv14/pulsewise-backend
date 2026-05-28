const env = require('./env');

let redisModule = null;
let missingDependencyLogged = false;
const redisEnv = env.redis || {};
const redisStatus = {
  enabled: Boolean(redisEnv.enabled),
  available: false,
  backend: redisEnv.enabled ? 'redis' : 'memory',
  lastConnectedAt: null,
  lastError: null,
};

function loadRedisModule() {
  if (redisModule) {
    return redisModule;
  }

  try {
    // Optional dependency during local development/test.
    // eslint-disable-next-line global-require
    redisModule = require('redis');
    return redisModule;
  } catch (_error) {
    if (!missingDependencyLogged && redisEnv.enabled && env.nodeEnv !== 'test') {
      missingDependencyLogged = true;
      console.warn(
        '[redis] package "redis" belum terpasang. Fallback ke memori lokal akan digunakan.'
      );
      redisStatus.available = false;
      redisStatus.backend = 'memory';
      redisStatus.lastError = 'missing redis package';
    }

    return null;
  }
}

let clientPromise = null;

async function getRedisClient() {
  if (!redisEnv.enabled) {
    return null;
  }

  if (clientPromise) {
    return clientPromise;
  }

  const redis = loadRedisModule();
  if (!redis?.createClient) {
    return null;
  }

  clientPromise = (async () => {
    const client = redis.createClient({
      url: redisEnv.url || undefined,
      socket: redisEnv.url
        ? undefined
        : {
            host: redisEnv.host,
            port: redisEnv.port,
          },
      password: redisEnv.password || undefined,
      database: redisEnv.db,
    });

    client.on('error', (error) => {
      if (env.nodeEnv !== 'test') {
        console.error('[redis] error', error);
      }
      redisStatus.lastError = error.message;
    });

    try {
      await client.connect();
      redisStatus.available = true;
      redisStatus.backend = 'redis';
      redisStatus.lastConnectedAt = new Date().toISOString();
      redisStatus.lastError = null;
      return client;
    } catch (error) {
      if (env.nodeEnv !== 'test') {
        console.error('[redis] gagal connect, fallback ke memori lokal', error);
      }

      redisStatus.available = false;
      redisStatus.backend = 'memory';
      redisStatus.lastError = error.message;
      clientPromise = null;
      try {
        await client.quit();
      } catch (_quitError) {
        // noop
      }
      return null;
    }
  })();

  return clientPromise;
}

async function warmRedisConnection() {
  if (!redisEnv.enabled) {
    return null;
  }

  return getRedisClient();
}

module.exports = {
  getRedisClient,
  warmRedisConnection,
  getRedisRuntimeStatus: () => ({
    ...redisStatus,
  }),
};
