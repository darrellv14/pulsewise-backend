jest.mock('../src/repositories/fcmTokenRepository', () => ({
  listUserFcmTokens: jest.fn(),
  upsertUserFcmToken: jest.fn(),
  revokeUserFcmTokens: jest.fn(),
}));

jest.mock('../src/repositories/userRepository', () => ({
  findUserById: jest.fn(),
}));

const fcmTokenRepository = require('../src/repositories/fcmTokenRepository');
const userRepository = require('../src/repositories/userRepository');
const notificationService = require('../src/services/notificationService');

describe('fcmTokenService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('registerFcmToken stores token for matching actor scope', async () => {
    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
    });
    fcmTokenRepository.upsertUserFcmToken.mockResolvedValue({
      token: {
        fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId: '11111111-1111-4111-8111-111111111111',
        platform: 'android',
        isActive: true,
      },
      wasCreated: true,
    });

    const result = await notificationService.registerFcmToken({
      actor: {
        userId: '11111111-1111-4111-8111-111111111111',
        role: 'patient',
      },
      userId: '11111111-1111-4111-8111-111111111111',
      payload: {
        fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
        platform: 'android',
        deviceId: 'android-installation-001',
      },
    });

    expect(userRepository.findUserById).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111'
    );
    expect(fcmTokenRepository.upsertUserFcmToken).toHaveBeenCalledWith({
      userId: '11111111-1111-4111-8111-111111111111',
      fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
      platform: 'android',
      deviceId: 'android-installation-001',
      deviceName: undefined,
      appVersion: undefined,
      appBuild: undefined,
      locale: undefined,
      timezone: undefined,
    });
    expect(result.wasCreated).toBe(true);
  });

  test('listFcmTokens returns token registry items for matching actor scope', async () => {
    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
    });
    fcmTokenRepository.listUserFcmTokens.mockResolvedValue([
      {
        fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        platform: 'android',
        isActive: true,
      },
    ]);

    const result = await notificationService.listFcmTokens({
      actor: {
        userId: '11111111-1111-4111-8111-111111111111',
        role: 'patient',
      },
      userId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual({
      items: [
        {
          fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          platform: 'android',
          isActive: true,
        },
      ],
    });
  });

  test('revokeFcmToken is idempotent and returns revoke summary', async () => {
    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
    });
    fcmTokenRepository.revokeUserFcmTokens.mockResolvedValue({
      revokedCount: 1,
      items: [
        {
          fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          isActive: false,
        },
      ],
    });

    const result = await notificationService.revokeFcmToken({
      actor: {
        userId: '11111111-1111-4111-8111-111111111111',
        role: 'patient',
      },
      userId: '11111111-1111-4111-8111-111111111111',
      payload: {
        fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
      },
    });

    expect(result.revokedCount).toBe(1);
    expect(fcmTokenRepository.revokeUserFcmTokens).toHaveBeenCalledWith({
      userId: '11111111-1111-4111-8111-111111111111',
      fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
      deviceId: undefined,
    });
  });

  test('rejects registerFcmToken when actor tries to manage another user token scope', async () => {
    await expect(
      notificationService.registerFcmToken({
        actor: {
          userId: '11111111-1111-4111-8111-111111111111',
          role: 'patient',
        },
        userId: '22222222-2222-4222-8222-222222222222',
        payload: {
          fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
          platform: 'android',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Akses data user ditolak',
    });
  });

  test('rejects listFcmTokens when target user does not exist', async () => {
    userRepository.findUserById.mockResolvedValue(null);

    await expect(
      notificationService.listFcmTokens({
        actor: {
          userId: '11111111-1111-4111-8111-111111111111',
          role: 'patient',
        },
        userId: '11111111-1111-4111-8111-111111111111',
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'User tidak ditemukan',
    });
  });
});
