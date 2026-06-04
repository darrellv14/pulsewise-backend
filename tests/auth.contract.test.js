const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const {
  expectObjectKeys,
  expectSuccessEnvelope,
  expectFailureEnvelope,
} = require('./helpers/contractAssertions');

jest.mock('../src/services/authService', () => ({
  register: jest.fn(),
  sendEmailVerification: jest.fn(),
  confirmEmailVerification: jest.fn(),
  beginGoogleAuth: jest.fn(),
  completeGoogleRegistration: jest.fn(),
  login: jest.fn(),
  getCurrentUser: jest.fn(),
  changePassword: jest.fn(),
  requestAccountDeletion: jest.fn(),
  confirmAccountDeletion: jest.fn(),
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

  test('POST /auth/change-password returns standard success envelope', async () => {
    authService.changePassword.mockResolvedValue({
      nextStep: 'LOGIN_AGAIN',
    });

    const response = await request(app)
      .post('/auth/change-password')
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

  test('POST /auth/login returns stable success envelope and payload keys', async () => {
    authService.login.mockResolvedValue({
      token: 'jwt-token',
      user: {
        userId,
        email: 'patient@pulsewise.local',
        role: 'patient',
        avatarPhoto: null,
      },
    });

    const response = await request(app).post('/auth/login').send({
      email: 'patient@pulsewise.local',
      password: 'dev12345',
    });

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Login berhasil');
    expectObjectKeys(response.body.data, ['token', 'user']);
    expectObjectKeys(response.body.data.user, ['userId', 'email', 'role', 'avatarPhoto']);
  });

  test('GET /auth/me returns stable success envelope and profile keys', async () => {
    authService.getCurrentUser.mockResolvedValue({
      userId,
      username: 'patient_demo',
      email: 'patient@pulsewise.local',
      firstName: 'Demo',
      lastName: 'Patient',
      avatarPhoto: null,
      role: 'patient',
      onboardingCompleted: true,
    });

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Data user berhasil diambil');
    expectObjectKeys(response.body.data, [
      'userId',
      'username',
      'email',
      'firstName',
      'lastName',
      'avatarPhoto',
      'role',
      'onboardingCompleted',
    ]);
  });

  test('POST /auth/change-password validates payload', async () => {
    const response = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
        confirmNewPassword: 'different-password',
      });

    expectFailureEnvelope(response, 400, 'Validasi request gagal');
  });

  test('POST /auth/change-password requires authentication', async () => {
    const response = await request(app).post('/auth/change-password').send({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
      confirmNewPassword: 'new-password-123',
    });

    expectFailureEnvelope(response, 401, 'Token tidak ditemukan');
  });

  test('POST /auth/account-deletion/request returns standard success envelope', async () => {
    authService.requestAccountDeletion.mockResolvedValue({
      nextStep: 'CONFIRM_ACCOUNT_DELETION',
      requiresReauth: true,
      reauthMethod: 'otp',
      availableReauthMethods: ['password', 'otp'],
      deletionToken: 'delete-token',
      delivery: 'email',
      expiresInMinutes: 10,
      warning: {
        permanent: true,
        recoverable: false,
        confirmationText: 'HAPUS AKUN',
      },
    });

    const response = await request(app)
      .post('/auth/account-deletion/request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        confirmationText: 'HAPUS AKUN',
        reauthMethod: 'otp',
      });

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Permintaan penghapusan akun berhasil dibuat');
    expectObjectKeys(response.body.data, [
      'nextStep',
      'requiresReauth',
      'reauthMethod',
      'availableReauthMethods',
      'deletionToken',
      'delivery',
      'expiresInMinutes',
      'warning',
    ]);
  });

  test('POST /auth/account-deletion/confirm returns stable success envelope', async () => {
    authService.confirmAccountDeletion.mockResolvedValue({
      nextStep: 'LOGOUT',
      deleted: true,
      deletedAt: '2026-06-04T10:00:00.000Z',
      reauthMethod: 'password',
      sessionRevoked: true,
      user: {
        userId,
        email: 'patient@pulsewise.local',
        role: 'patient',
      },
    });

    const response = await request(app)
      .post('/auth/account-deletion/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deletionToken: 'delete-token',
        password: 'dev12345',
      });

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Akun berhasil dihapus permanen');
    expectObjectKeys(response.body.data, [
      'nextStep',
      'deleted',
      'deletedAt',
      'reauthMethod',
      'sessionRevoked',
      'user',
    ]);
  });
});
