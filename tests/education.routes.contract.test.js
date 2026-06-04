const request = require('supertest');
const app = require('../src/app');

describe('education route contract', () => {
  const articleId = '11111111-1111-4111-8111-111111111111';
  const commentId = '22222222-2222-4222-8222-222222222222';

  test('GET published education feed route is registered', async () => {
    const response = await request(app).get('/education/articles');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Token tidak ditemukan',
    });
  });

  test('POST article like route is registered', async () => {
    const response = await request(app).post(`/education/articles/${articleId}/likes`).send({});

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Token tidak ditemukan',
    });
  });

  test('POST admin hide comment route is registered', async () => {
    const response = await request(app).post(`/admin/education/comments/${commentId}/hide`).send({});

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Token tidak ditemukan',
    });
  });
});
