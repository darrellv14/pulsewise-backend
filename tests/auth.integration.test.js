const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

describe('Auth integration', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('success: login and fetch current user', async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'dev@pulsewise.local',
        password: 'dev12345',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data).toHaveProperty('token');

    const meResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data.email).toBe('dev@pulsewise.local');
  });

  test('invalid payload: register without required fields', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'invalid_user_only',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validasi request gagal');
  });

  test('unauthorized: /auth/me without token', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
