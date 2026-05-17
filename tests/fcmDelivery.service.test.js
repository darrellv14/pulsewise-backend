jest.mock('../src/repositories/fcmTokenRepository', () => ({
  listActiveUserFcmTokens: jest.fn(),
  markFcmTokenSendSuccess: jest.fn(),
  markFcmTokenSendFailure: jest.fn(),
}));

jest.mock('../src/repositories/pushNotificationLogRepository', () => ({
  createPushNotificationLog: jest.fn(),
}));

jest.mock('../src/repositories/userRepository', () => ({
  findUserById: jest.fn(),
}));

jest.mock('../src/services/notification/fcmTransport', () => ({
  sendFcmMessage: jest.fn(),
}));

const fcmTokenRepository = require('../src/repositories/fcmTokenRepository');
const pushNotificationLogRepository = require('../src/repositories/pushNotificationLogRepository');
const userRepository = require('../src/repositories/userRepository');
const { sendFcmMessage } = require('../src/services/notification/fcmTransport');
const notificationService = require('../src/services/notificationService');

describe('fcmDeliveryService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('sendFcmTestNotification sends to all active tokens and records sent logs', async () => {
    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
    });
    fcmTokenRepository.listActiveUserFcmTokens.mockResolvedValue([
      {
        fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        fcmToken: 'token-1',
        platform: 'android',
      },
      {
        fcmTokenId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        fcmToken: 'token-2',
        platform: 'android',
      },
    ]);
    sendFcmMessage
      .mockResolvedValueOnce({
        providerMessageId: 'projects/pulse-wise-app/messages/1',
        providerResponse: { name: 'projects/pulse-wise-app/messages/1' },
      })
      .mockResolvedValueOnce({
        providerMessageId: 'projects/pulse-wise-app/messages/2',
        providerResponse: { name: 'projects/pulse-wise-app/messages/2' },
      });

    const result = await notificationService.sendFcmTestNotification({
      actor: {
        userId: '11111111-1111-4111-8111-111111111111',
        role: 'patient',
      },
      userId: '11111111-1111-4111-8111-111111111111',
      payload: {
        title: 'Test Reminder',
        body: 'Halo dari PulseWise FCM test.',
        data: {
          action: 'open_medication_reminder',
          medicationId: '0f282e3e-2d3c-494b-bc6f-e204c7e3e3d5',
        },
      },
    });

    expect(sendFcmMessage).toHaveBeenCalledTimes(2);
    expect(fcmTokenRepository.markFcmTokenSendSuccess).toHaveBeenCalledTimes(2);
    expect(pushNotificationLogRepository.createPushNotificationLog).toHaveBeenCalledTimes(2);
    expect(result.sentCount).toBe(2);
    expect(result.failedCount).toBe(0);
  });

  test('sendFcmTestNotification marks terminal invalid token as inactive and logs failure', async () => {
    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
    });
    fcmTokenRepository.listActiveUserFcmTokens.mockResolvedValue([
      {
        fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        fcmToken: 'token-1',
        platform: 'android',
      },
    ]);

    const transportError = new Error('Pengiriman FCM gagal');
    transportError.providerErrorCode = 'UNREGISTERED';
    transportError.providerResponse = {
      error: {
        status: 'UNREGISTERED',
      },
    };
    transportError.isTerminalTokenError = true;

    sendFcmMessage.mockRejectedValue(transportError);

    const result = await notificationService.sendFcmTestNotification({
      actor: {
        userId: '11111111-1111-4111-8111-111111111111',
        role: 'patient',
      },
      userId: '11111111-1111-4111-8111-111111111111',
      payload: {
        title: 'Test Reminder',
        body: 'Halo dari PulseWise FCM test.',
        data: {
          action: 'open_medication_reminder',
        },
      },
    });

    expect(fcmTokenRepository.markFcmTokenSendFailure).toHaveBeenCalledWith({
      fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      errorCode: 'UNREGISTERED',
      deactivate: true,
    });
    expect(pushNotificationLogRepository.createPushNotificationLog).toHaveBeenCalledTimes(1);
    expect(result.sentCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        status: 'failed',
        errorCode: 'UNREGISTERED',
      })
    );
  });

  test('sendFcmTestNotification rejects when no active token exists', async () => {
    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
    });
    fcmTokenRepository.listActiveUserFcmTokens.mockResolvedValue([]);

    await expect(
      notificationService.sendFcmTestNotification({
        actor: {
          userId: '11111111-1111-4111-8111-111111111111',
          role: 'patient',
        },
        userId: '11111111-1111-4111-8111-111111111111',
        payload: {
          title: 'Test Reminder',
          body: 'Halo dari PulseWise FCM test.',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'FCM token aktif tidak ditemukan',
    });
  });
});
