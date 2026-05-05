const env = require('../../config/env');
const { getRedisClient } = require('../../config/redis');

const memoryStore = new Map();

function buildNamespacedKey(key) {
  return `${env.redis.prefix}:${key}`;
}

function pruneMemoryStore(now = Date.now()) {
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

async function getJson(key) {
  const namespacedKey = buildNamespacedKey(key);
  const client = await getRedisClient();

  if (client) {
    const rawValue = await client.get(namespacedKey);
    return rawValue ? JSON.parse(rawValue) : null;
  }

  const entry = memoryStore.get(namespacedKey);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(namespacedKey);
    return null;
  }

  return entry.value;
}

async function setJson(key, value, ttlSeconds) {
  const namespacedKey = buildNamespacedKey(key);
  const ttl = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : 60;
  const client = await getRedisClient();

  if (client) {
    await client.set(namespacedKey, JSON.stringify(value), {
      EX: ttl,
    });
    return;
  }

  if (memoryStore.size > 10_000) {
    pruneMemoryStore();
  }

  memoryStore.set(namespacedKey, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
}

async function getOrSetJson(key, ttlSeconds, loader) {
  const cached = await getJson(key);
  if (cached !== null) {
    return cached;
  }

  const value = await loader();
  await setJson(key, value, ttlSeconds);
  return value;
}

async function invalidateExact(keys) {
  const normalizedKeys = keys
    .filter(Boolean)
    .map((key) => buildNamespacedKey(key));

  if (!normalizedKeys.length) {
    return;
  }

  const client = await getRedisClient();
  if (client) {
    await client.del(...normalizedKeys);
    return;
  }

  for (const key of normalizedKeys) {
    memoryStore.delete(key);
  }
}

async function invalidateByPrefixes(prefixes) {
  const normalizedPrefixes = prefixes
    .filter(Boolean)
    .map((prefix) => buildNamespacedKey(prefix));

  if (!normalizedPrefixes.length) {
    return;
  }

  const client = await getRedisClient();
  if (client) {
    for (const prefix of normalizedPrefixes) {
      const pattern = `${prefix}*`;
      const iterator = client.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      });

      for await (const key of iterator) {
        await client.del(key);
      }
    }
    return;
  }

  for (const key of memoryStore.keys()) {
    if (normalizedPrefixes.some((prefix) => key.startsWith(prefix))) {
      memoryStore.delete(key);
    }
  }
}

module.exports = {
  getJson,
  setJson,
  getOrSetJson,
  invalidateExact,
  invalidateByPrefixes,
  __resetMemoryStoreForTests: () => memoryStore.clear(),
};
