jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(),
}));

const { getRedisClient } = require('../src/config/redis');
const cacheService = require('../src/services/cache/cacheService');

function createFakeRedisClient() {
  const store = new Map();

  return {
    get: jest.fn(async (key) => store.get(key) || null),
    set: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    del: jest.fn(async (...keys) => {
      for (const key of keys) {
        store.delete(key);
      }
    }),
    scanIterator: jest.fn(({ MATCH }) => ({
      async *[Symbol.asyncIterator]() {
        const prefix = MATCH.replace(/\*$/, '');
        for (const key of store.keys()) {
          if (key.startsWith(prefix)) {
            yield key;
          }
        }
      },
    })),
  };
}

describe('Cache service Redis backend', () => {
  beforeEach(() => {
    cacheService.__resetMemoryStoreForTests();
    jest.clearAllMocks();
  });

  test('getOrSetJson uses Redis get/set path when client is available', async () => {
    const client = createFakeRedisClient();
    getRedisClient.mockResolvedValue(client);
    const loader = jest.fn(async () => ({ ok: true }));

    const first = await cacheService.getOrSetJson('dashboard:test', 30, loader);
    const second = await cacheService.getOrSetJson('dashboard:test', 30, loader);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(client.get).toHaveBeenCalledTimes(2);
    expect(client.set).toHaveBeenCalledTimes(1);
  });

  test('invalidateByPrefixes deletes matching Redis keys', async () => {
    const client = createFakeRedisClient();
    getRedisClient.mockResolvedValue(client);

    await cacheService.setJson('dashboard:vitals:1', { ok: 1 }, 30);
    await cacheService.setJson('dashboard:summary:1', { ok: 2 }, 30);
    await cacheService.setJson('other:key', { ok: 3 }, 30);

    await cacheService.invalidateByPrefixes(['dashboard:']);

    expect(await cacheService.getJson('dashboard:vitals:1')).toBeNull();
    expect(await cacheService.getJson('dashboard:summary:1')).toBeNull();
    expect(await cacheService.getJson('other:key')).toEqual({ ok: 3 });
  });
});
