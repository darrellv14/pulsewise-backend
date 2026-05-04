jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
}));

const { createRateLimiter } = require('../src/middlewares/rateLimit');

describe('rate limit middleware', () => {
  test('returns 429 after exceeding configured in-memory limit', async () => {
    const limiter = createRateLimiter({
      name: 'auth-test',
      windowMs: 60_000,
      max: 1,
      message: 'Terlalu banyak percobaan autentikasi',
    });

    const req = {
      headers: {},
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1',
      },
    };
    const next = jest.fn();

    const firstRes = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    await limiter(req, firstRes, next);

    const secondRes = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    await limiter(req, secondRes, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(secondRes.set).toHaveBeenCalledWith('Retry-After', expect.any(String));
    expect(secondRes.status).toHaveBeenCalledWith(429);
    expect(secondRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Terlalu banyak percobaan autentikasi',
    });
  });
});
