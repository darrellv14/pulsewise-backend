const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const {
  expectObjectKeys,
  expectSuccessEnvelope,
  expectFailureEnvelope,
} = require('./helpers/contractAssertions');

jest.mock('../src/services/notificationService', () => ({
  registerFcmToken: jest.fn(),
  listFcmTokens: jest.fn(),
  revokeFcmToken: jest.fn(),
  sendFcmTestNotification: jest.fn(),
}));

const notificationService = require('../src/services/notificationService');
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

describe('FCM token API contract', () => {
  const userId = '229f4f2c-a907-4c51-877a-c3f867453744';
  const token = issueToken({ userId, role: 'patient' });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /users/:userId/fcm-tokens returns upsert contract', async () => {
    notificationService.registerFcmToken.mockResolvedValue({
      token: {
        fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId,
        platform: 'android',
        deviceId: 'android-installation-001',
        deviceName: 'Pixel 8',
        appVersion: '1.0.0',
        appBuild: '42',
        locale: 'id-ID',
        timezone: 'Asia/Jakarta',
        isActive: true,
        lastSeenAt: '2026-05-17T10:10:00.000Z',
        revokedAt: null,
        failureCount: 0,
        lastFailureCode: null,
        lastSentAt: null,
        createdAt: '2026-05-17T10:10:00.000Z',
        updatedAt: '2026-05-17T10:10:00.000Z',
      },
      wasCreated: true,
    });

    const response = await request(app)
      .post(`/users/${userId}/fcm-tokens`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
        platform: 'android',
        deviceId: 'android-installation-001',
      });

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'FCM token berhasil disimpan');
    expectObjectKeys(response.body.data, ['token', 'wasCreated']);
    expectObjectKeys(response.body.data.token, [
      'fcmTokenId',
      'userId',
      'platform',
      'deviceId',
      'deviceName',
      'appVersion',
      'appBuild',
      'locale',
      'timezone',
      'isActive',
      'lastSeenAt',
      'revokedAt',
      'failureCount',
      'lastFailureCode',
      'lastSentAt',
      'createdAt',
      'updatedAt',
    ]);
  });

  test('GET /users/:userId/fcm-tokens returns list contract', async () => {
    notificationService.listFcmTokens.mockResolvedValue({
      items: [
        {
          fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          userId,
          platform: 'android',
          deviceId: 'android-installation-001',
          deviceName: 'Pixel 8',
          appVersion: '1.0.0',
          appBuild: '42',
          locale: 'id-ID',
          timezone: 'Asia/Jakarta',
          isActive: true,
          lastSeenAt: '2026-05-17T10:10:00.000Z',
          revokedAt: null,
          failureCount: 0,
          lastFailureCode: null,
          lastSentAt: null,
          createdAt: '2026-05-17T10:10:00.000Z',
          updatedAt: '2026-05-17T10:10:00.000Z',
        },
      ],
    });

    const response = await request(app)
      .get(`/users/${userId}/fcm-tokens`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Daftar FCM token berhasil diambil');
    expectObjectKeys(response.body.data, ['items']);
    expectObjectKeys(response.body.data.items[0], [
      'fcmTokenId',
      'userId',
      'platform',
      'deviceId',
      'deviceName',
      'appVersion',
      'appBuild',
      'locale',
      'timezone',
      'isActive',
      'lastSeenAt',
      'revokedAt',
      'failureCount',
      'lastFailureCode',
      'lastSentAt',
      'createdAt',
      'updatedAt',
    ]);
  });

  test('DELETE /users/:userId/fcm-tokens returns revoke contract', async () => {
    notificationService.revokeFcmToken.mockResolvedValue({
      revokedCount: 1,
      items: [
        {
          fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          userId,
          platform: 'android',
          deviceId: 'android-installation-001',
          deviceName: 'Pixel 8',
          appVersion: '1.0.0',
          appBuild: '42',
          locale: 'id-ID',
          timezone: 'Asia/Jakarta',
          isActive: false,
          lastSeenAt: '2026-05-17T10:10:00.000Z',
          revokedAt: '2026-05-17T10:30:00.000Z',
          failureCount: 0,
          lastFailureCode: null,
          lastSentAt: null,
          createdAt: '2026-05-17T10:10:00.000Z',
          updatedAt: '2026-05-17T10:30:00.000Z',
        },
      ],
    });

    const response = await request(app)
      .delete(`/users/${userId}/fcm-tokens`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
      });

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'FCM token berhasil dinonaktifkan');
    expectObjectKeys(response.body.data, ['revokedCount', 'items']);
  });

  test('POST /users/:userId/fcm-tokens validates payload', async () => {
    const response = await request(app)
      .post(`/users/${userId}/fcm-tokens`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        platform: 'android',
      });

    expectFailureEnvelope(response, 400, 'Validasi request gagal');
  });

  test('DELETE /users/:userId/fcm-tokens requires fcmToken or deviceId', async () => {
    const response = await request(app)
      .delete(`/users/${userId}/fcm-tokens`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expectFailureEnvelope(response, 400, 'Validasi request gagal');
  });

  test('POST /users/:userId/fcm-test returns send summary contract', async () => {
    notificationService.sendFcmTestNotification.mockResolvedValue({
      userId,
      notificationType: 'test_notification',
      sentCount: 1,
      failedCount: 0,
      results: [
        {
          fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          platform: 'android',
          status: 'sent',
          messageId: 'projects/pulse-wise-app/messages/1',
        },
      ],
    });

    const response = await request(app)
      .post(`/users/${userId}/fcm-test`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Reminder',
        body: 'Halo dari PulseWise FCM test.',
        data: {
          action: 'open_medication_reminder',
          medicationId: '0f282e3e-2d3c-494b-bc6f-e204c7e3e3d5',
          status: 'Open',
          scheduledDate: '2026-05-17',
          scheduledTime: '08:00',
        },
      });

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Test notification berhasil dikirim');
    expectObjectKeys(response.body.data, [
      'userId',
      'notificationType',
      'sentCount',
      'failedCount',
      'results',
    ]);
    expectObjectKeys(response.body.data.results[0], [
      'fcmTokenId',
      'platform',
      'status',
      'messageId',
    ]);
  });
});
