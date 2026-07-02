jest.mock('../src/repositories/userRepository', () => ({
  findUserById: jest.fn(),
}));

jest.setTimeout(15000);

const buildTestEnv = (originalEnv, overrides = {}) => ({
  ...originalEnv,
  NODE_ENV: 'production',
  JWT_SECRET: 'super-secret',
  POSTGRES_HOST: 'postgres',
  POSTGRES_PORT: '5432',
  POSTGRES_DB: 'pulsewise',
  POSTGRES_USER: 'pulsewise',
  POSTGRES_PASSWORD: 'secret',
  AUTH_RECHECK_USER: 'true',
  ...overrides,
});

function createGuardedProbeApp() {
  const express = require('express');
  const authenticate = require('../src/middlewares/authenticate');
  const {
    assertAdminScope,
    assertDoctorProfileScope,
    assertDoctorScope,
  } = require('../src/services/shared/guards');

  const app = express();

  app.get('/doctors/:doctorId/dashboard/probe', authenticate, (req, res) => {
    try {
      assertDoctorScope({
        actor: req.user,
        doctorId: req.params.doctorId,
      });

      return res.status(200).json({
        success: true,
        data: {
          role: req.user.role,
          roles: req.user.roles,
          accountStatus: req.user.accountStatus,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        details: error.details || null,
      });
    }
  });

  app.get('/doctors/:doctorId/profile/probe', authenticate, (req, res) => {
    try {
      assertDoctorProfileScope({
        actor: req.user,
        doctorId: req.params.doctorId,
      });

      return res.status(200).json({
        success: true,
        data: {
          role: req.user.role,
          roles: req.user.roles,
          accountStatus: req.user.accountStatus,
          doctorVerification: req.user.doctorVerification,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        details: error.details || null,
      });
    }
  });

  app.get('/admin/probe', authenticate, (req, res) => {
    try {
      assertAdminScope({
        actor: req.user,
      });

      return res.status(200).json({
        success: true,
        data: {
          role: req.user.role,
          roles: req.user.roles,
          accountStatus: req.user.accountStatus,
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        details: error.details || null,
      });
    }
  });

  return app;
}

describe('authenticate on doctor/admin protected routes', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
    jest.dontMock('dotenv');
  });

  test('active doctor can access doctor dashboard route when production recheck is enabled', async () => {
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env = buildTestEnv(originalEnv);

    const request = require('supertest');
    const jwt = require('jsonwebtoken');
    const userRepository = require('../src/repositories/userRepository');

    userRepository.findUserById.mockResolvedValue({
      user_id: 'doctor-1',
      role: 'doctor',
      roles: ['doctor'],
      account_status: 'active',
      doctor_verification: { isVerified: true },
    });

    const app = createGuardedProbeApp();
    const token = jwt.sign(
      { userId: 'doctor-1', email: 'doctor@example.com', role: 'doctor' },
      'super-secret'
    );

    const response = await request(app)
      .get('/doctors/doctor-1/dashboard/probe')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        role: 'doctor',
        roles: ['doctor'],
        accountStatus: 'active',
      },
    });
    expect(userRepository.findUserById).toHaveBeenCalledWith('doctor-1');
  });

  test('pending doctor is blocked from dashboard route after auth enrichment', async () => {
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env = buildTestEnv(originalEnv);

    const request = require('supertest');
    const jwt = require('jsonwebtoken');
    const userRepository = require('../src/repositories/userRepository');

    userRepository.findUserById.mockResolvedValue({
      user_id: 'doctor-pending',
      role: 'doctor',
      roles: ['doctor'],
      account_status: 'pending_admin_verification',
      doctor_verification: { isVerified: false },
    });

    const app = createGuardedProbeApp();
    const token = jwt.sign(
      { userId: 'doctor-pending', email: 'doctor@example.com', role: 'doctor' },
      'super-secret'
    );

    const response = await request(app)
      .get('/doctors/doctor-pending/dashboard/probe')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Akun dokter sedang menunggu verifikasi admin',
      details: {
        nextStep: 'WAIT_ADMIN_VERIFICATION',
        accountStatus: 'pending_admin_verification',
      },
    });
  });

  test('pending doctor can still access doctor profile route for onboarding flow', async () => {
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env = buildTestEnv(originalEnv);

    const request = require('supertest');
    const jwt = require('jsonwebtoken');
    const userRepository = require('../src/repositories/userRepository');

    userRepository.findUserById.mockResolvedValue({
      user_id: 'doctor-pending',
      role: 'doctor',
      roles: ['doctor'],
      account_status: 'pending_admin_verification',
      doctor_verification: { isVerified: false },
    });

    const app = createGuardedProbeApp();
    const token = jwt.sign(
      { userId: 'doctor-pending', email: 'doctor@example.com', role: 'doctor' },
      'super-secret'
    );

    const response = await request(app)
      .get('/doctors/doctor-pending/profile/probe')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        role: 'doctor',
        roles: ['doctor'],
        accountStatus: 'pending_admin_verification',
        doctorVerification: {
          isVerified: false,
        },
      },
    });
  });

  test('active admin can access admin route when recheck is enabled', async () => {
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env = buildTestEnv(originalEnv);

    const request = require('supertest');
    const jwt = require('jsonwebtoken');
    const userRepository = require('../src/repositories/userRepository');

    userRepository.findUserById.mockResolvedValue({
      user_id: 'admin-1',
      role: 'admin',
      roles: ['admin'],
      account_status: 'active',
    });

    const app = createGuardedProbeApp();
    const token = jwt.sign(
      { userId: 'admin-1', email: 'admin@example.com', role: 'admin' },
      'super-secret'
    );

    const response = await request(app)
      .get('/admin/probe')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        role: 'admin',
        roles: ['admin'],
        accountStatus: 'active',
      },
    });
  });

  test('inactive admin token is rejected before hitting admin guard when recheck is enabled', async () => {
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env = buildTestEnv(originalEnv);

    const request = require('supertest');
    const jwt = require('jsonwebtoken');
    const userRepository = require('../src/repositories/userRepository');

    userRepository.findUserById.mockResolvedValue({
      user_id: 'admin-1',
      role: 'admin',
      roles: ['admin'],
      account_status: 'suspended',
    });

    const app = createGuardedProbeApp();
    const token = jwt.sign(
      { userId: 'admin-1', email: 'admin@example.com', role: 'admin' },
      'super-secret'
    );

    const response = await request(app)
      .get('/admin/probe')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Token tidak valid',
    });
  });

  test('doctor and admin token claims remain usable when explicit recheck is disabled', async () => {
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env = buildTestEnv(originalEnv, {
      AUTH_RECHECK_USER: 'false',
    });

    const request = require('supertest');
    const jwt = require('jsonwebtoken');
    const userRepository = require('../src/repositories/userRepository');
    const app = createGuardedProbeApp();

    const doctorToken = jwt.sign(
      { userId: 'doctor-2', email: 'doctor2@example.com', role: 'doctor' },
      'super-secret'
    );
    const adminToken = jwt.sign(
      { userId: 'admin-2', email: 'admin2@example.com', role: 'admin' },
      'super-secret'
    );

    const doctorResponse = await request(app)
      .get('/doctors/doctor-2/dashboard/probe')
      .set('Authorization', `Bearer ${doctorToken}`);

    const adminResponse = await request(app)
      .get('/admin/probe')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(doctorResponse.status).toBe(200);
    expect(doctorResponse.body).toMatchObject({
      success: true,
      data: {
        role: 'doctor',
        roles: ['doctor'],
        accountStatus: 'active',
      },
    });

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body).toMatchObject({
      success: true,
      data: {
        role: 'admin',
        roles: ['admin'],
        accountStatus: 'active',
      },
    });

    expect(userRepository.findUserById).not.toHaveBeenCalled();
  });
});
