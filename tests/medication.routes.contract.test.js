const request = require('supertest');
const app = require('../src/app');

describe('medication route contract', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const medicationId = '22222222-2222-4222-8222-222222222222';

  test('PATCH update medication route is registered', async () => {
    const response = await request(app).patch(`/api/v1/users/${userId}/medications/${medicationId}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Token tidak ditemukan',
    });
  });

  test('PUT update medication route is not registered', async () => {
    const response = await request(app).put(`/api/v1/users/${userId}/medications/${medicationId}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Route tidak ditemukan',
    });
  });
});
