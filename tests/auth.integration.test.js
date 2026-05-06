const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('../src/repositories/userRepository', () => ({
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  updateUserPasswordHash: jest.fn(),
}));

const bcrypt = require('bcrypt');
const userRepository = require('../src/repositories/userRepository');
const app = require('../src/app');

describe('Auth integration', () => {
  const patientUser = {
    user_id: '229f4f2c-a907-4c51-877a-c3f867453744',
    username: 'dev_patient',
    email: 'dev@pulsewise.local',
    password_hash: '$2b$10$hashed',
    avatar_photo: null,
    google_sub: null,
    onboarding_completed: true,
    account_status: 'active',
    first_name: 'Dev',
    last_name: 'Patient',
    role: 'patient',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('success: login and fetch current user', async () => {
    userRepository.findUserByEmail.mockResolvedValue(patientUser);
    userRepository.findUserById.mockResolvedValue(patientUser);
    bcrypt.compare.mockResolvedValue(true);

    const loginResponse = await request(app).post('/auth/login').send({
      email: 'dev@pulsewise.local',
      password: 'dev12345',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data).toHaveProperty('token');
    expect(loginResponse.body.data.user).toEqual(
      expect.objectContaining({
        userId: patientUser.user_id,
        email: patientUser.email,
        role: patientUser.role,
        avatarPhoto: patientUser.avatar_photo,
      })
    );

    const decoded = jwt.verify(loginResponse.body.data.token, env.jwtSecret);
    expect(decoded).toEqual(
      expect.objectContaining({
        userId: patientUser.user_id,
        email: patientUser.email,
        role: patientUser.role,
      })
    );

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data).toEqual(
      expect.objectContaining({
        userId: patientUser.user_id,
        email: patientUser.email,
        avatarPhoto: patientUser.avatar_photo,
        role: patientUser.role,
      })
    );
  });

  test('invalid payload: register without required fields', async () => {
    const response = await request(app).post('/auth/register').send({
      username: 'invalid_user_only',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validasi request gagal');
  });

  test('unauthorized: /auth/me without token', async () => {
    const response = await request(app).get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
