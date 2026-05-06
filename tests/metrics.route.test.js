const request = require('supertest');

describe('metrics route', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  test('GET /metrics returns 404 when metrics are disabled', async () => {
    process.env.NODE_ENV = 'test';
    process.env.METRICS_ENABLED = 'false';
    delete process.env.METRICS_TOKEN;

    // eslint-disable-next-line global-require
    const app = require('../src/app');

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('GET /metrics returns prometheus text when token is valid', async () => {
    process.env.NODE_ENV = 'test';
    process.env.METRICS_ENABLED = 'true';
    process.env.METRICS_TOKEN = 'metrics-secret';

    // eslint-disable-next-line global-require
    const app = require('../src/app');

    const response = await request(app).get('/metrics').set('x-metrics-token', 'metrics-secret');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('pulsewise_cache_hits_total');
    expect(response.text).toContain('pulsewise_redis_available');
  });
});
