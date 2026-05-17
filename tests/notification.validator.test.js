const {
  registerFcmTokenSchema,
  revokeFcmTokenSchema,
  sendFcmTestSchema,
} = require('../src/validators/notificationValidator');
const { medicationReminderNotificationSchema } = require('../src/validators/medicationValidator');

describe('notification validator', () => {
  test('registerFcmTokenSchema accepts valid Android device payload', () => {
    const parsed = registerFcmTokenSchema.parse({
      fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
      platform: 'android',
      deviceId: 'android-installation-001',
      deviceName: 'Pixel 8',
      appVersion: '1.0.0',
      appBuild: '42',
      locale: 'id-ID',
      timezone: 'Asia/Jakarta',
    });

    expect(parsed.platform).toBe('android');
    expect(parsed.deviceId).toBe('android-installation-001');
  });

  test('registerFcmTokenSchema rejects unsupported platform', () => {
    expect(() =>
      registerFcmTokenSchema.parse({
        fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
        platform: 'windows_phone',
      })
    ).toThrow();
  });

  test('revokeFcmTokenSchema accepts fcmToken-only revoke payload', () => {
    const parsed = revokeFcmTokenSchema.parse({
      fcmToken: 'token-abcdefghijklmnopqrstuvwxyz-1234567890',
    });

    expect(parsed.fcmToken).toBe('token-abcdefghijklmnopqrstuvwxyz-1234567890');
  });

  test('revokeFcmTokenSchema accepts deviceId-only revoke payload', () => {
    const parsed = revokeFcmTokenSchema.parse({
      deviceId: 'android-installation-001',
    });

    expect(parsed.deviceId).toBe('android-installation-001');
  });

  test('revokeFcmTokenSchema rejects empty revoke payload', () => {
    expect(() => revokeFcmTokenSchema.parse({})).toThrow();
  });

  test('sendFcmTestSchema accepts title, body, and flat data payload', () => {
    const parsed = sendFcmTestSchema.parse({
      title: 'Test Reminder',
      body: 'Halo dari PulseWise FCM test.',
      data: {
        action: 'open_medication_reminder',
        medicationId: '0f282e3e-2d3c-494b-bc6f-e204c7e3e3d5',
        status: 'Open',
        scheduledTime: '08:00',
      },
    });

    expect(parsed.title).toBe('Test Reminder');
    expect(parsed.data.action).toBe('open_medication_reminder');
  });

  test('medicationReminderNotificationSchema accepts reminder notification trigger payload', () => {
    const parsed = medicationReminderNotificationSchema.parse({
      reminderId: '11111111-1111-4111-8111-111111111111',
      scheduledDate: '2026-05-17',
      scheduledTime: '08:00',
      status: 'Open',
    });

    expect(parsed.scheduledDate).toBe('2026-05-17');
    expect(parsed.status).toBe('Open');
  });
});
