jest.mock('../src/repositories/userRepository', () => ({
  findUserById: jest.fn(),
}));

describe('authenticate middleware', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
    jest.dontMock('dotenv');
  });

  test('rejects protected request when token user is no longer active', async () => {
    jest.doMock('dotenv', () => ({
      config: jest.fn(),
    }));

    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'super-secret',
      POSTGRES_HOST: 'postgres',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'pulsewise',
      POSTGRES_USER: 'pulsewise',
      POSTGRES_PASSWORD: 'secret',
      AUTH_RECHECK_USER: 'true',
    };

    const jwt = require('jsonwebtoken');
    const userRepository = require('../src/repositories/userRepository');
    const authenticate = require('../src/middlewares/authenticate');

    userRepository.findUserById.mockResolvedValue(null);

    const req = {
      headers: {
        authorization: `Bearer ${jwt.sign(
          { userId: 'u-1', email: 'patient@example.com', role: 'patient' },
          'super-secret'
        )}`,
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Token tidak valid',
      })
    );
  });

  test('allows pending doctor token so profile onboarding can continue', async () => {
    jest.doMock('dotenv', () => ({
      config: jest.fn(),
    }));

    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'super-secret',
      POSTGRES_HOST: 'postgres',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'pulsewise',
      POSTGRES_USER: 'pulsewise',
      POSTGRES_PASSWORD: 'secret',
      AUTH_RECHECK_USER: 'true',
    };

    const jwt = require('jsonwebtoken');
    const userRepository = require('../src/repositories/userRepository');
    const authenticate = require('../src/middlewares/authenticate');

    userRepository.findUserById.mockResolvedValue({
      user_id: 'u-doc',
      email: 'doctor@example.com',
      role: 'doctor',
      roles: ['doctor'],
      account_status: 'pending_admin_verification',
      doctor_verification: {
        isVerified: false,
      },
    });

    const req = {
      headers: {
        authorization: `Bearer ${jwt.sign(
          { userId: 'u-doc', email: 'doctor@example.com', role: 'doctor' },
          'super-secret'
        )}`,
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({
      userId: 'u-doc',
      role: 'doctor',
      roles: ['doctor'],
      accountStatus: 'pending_admin_verification',
      doctorVerification: {
        isVerified: false,
      },
    });
  });
});
