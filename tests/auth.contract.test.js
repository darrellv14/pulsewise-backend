const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');

jest.mock('../src/services/authService', () => ({
  register: jest.fn(),
  sendEmailVerification: jest.fn(),
  confirmEmailVerification: jest.fn(),
  beginGoogleAuth: jest.fn(),
  completeGoogleRegistration: jest.fn(),
  login: jest.fn(),
  getCurrentUser: jest.fn(),
  changePassword: jest.fn(),
}));

const authService = require('../src/services/authService');
const app = require('../src/app');

function issueToken({ userId, role }) {
  return jwt.sign(
    {
      userId,
      email: `${role}@pulsewise.local`,
      role,
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
}

describe('Auth API contract', () => {
  const userId = '229f4f2c-a907-4c51-877a-c3f867453744';
  const token = issueToken({ userId, role: 'patient' });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/v1/auth/change-password returns standard success envelope', async () => {
    authService.changePassword.mockResolvedValue({
      nextStep: 'LOGIN_AGAIN',
    });

    const response = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
        confirmNewPassword: 'new-password-123',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Password berhasil diperbarui',
      data: {
        nextStep: 'LOGIN_AGAIN',
      },
    });
  });

  test('POST /api/v1/auth/change-password validates payload', async () => {
    const response = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
        confirmNewPassword: 'different-password',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validasi request gagal');
  });

  test('POST /api/v1/auth/change-password requires authentication', async () => {
    const response = await request(app).post('/api/v1/auth/change-password').send({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
      confirmNewPassword: 'new-password-123',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
