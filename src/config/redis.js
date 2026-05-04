const env = require('./env');

let redisModule = null;
let missingDependencyLogged = false;

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
    if (!missingDependencyLogged && env.redis.enabled && env.nodeEnv !== 'test') {
      missingDependencyLogged = true;
      console.warn(
        '[redis] package "redis" belum terpasang. Fallback ke memori lokal akan digunakan.'
      );
    }

    return null;
  }
}

let clientPromise = null;

async function getRedisClient() {
  if (!env.redis.enabled) {
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
      url: env.redis.url || undefined,
      socket: env.redis.url
        ? undefined
        : {
            host: env.redis.host,
            port: env.redis.port,
          },
      password: env.redis.password || undefined,
      database: env.redis.db,
    });

    client.on('error', (error) => {
      if (env.nodeEnv !== 'test') {
        console.error('[redis] error', error);
      }
    });

    try {
      await client.connect();
      return client;
    } catch (error) {
      if (env.nodeEnv !== 'test') {
        console.error('[redis] gagal connect, fallback ke memori lokal', error);
      }

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

module.exports = {
  getRedisClient,
};
