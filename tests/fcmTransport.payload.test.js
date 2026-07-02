jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn(),
}));

describe('fcmTransport payload builder', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/pulsewise_test',
      FIREBASE_PROJECT_ID: 'pulsewise-firebase-test',
      FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@test.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
      FCM_ANDROID_CHANNEL_ID: 'pulsewise_reminders',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('buildFcmMessagePayload sets high-priority delivery hints across platforms', () => {
    const { buildFcmMessagePayload } = require('../src/services/notification/fcmTransport');

    const payload = buildFcmMessagePayload({
      token: 'sample-token',
      title: 'Reminder Obat',
      body: 'Saatnya minum obat.',
      data: {
        action: 'open_medication_reminder',
        medicationId: 'med-123',
        nullable: null,
      },
    });

    expect(payload).toEqual({
      message: expect.objectContaining({
        token: 'sample-token',
        notification: {
          title: 'Reminder Obat',
          body: 'Saatnya minum obat.',
        },
        data: {
          action: 'open_medication_reminder',
          medicationId: 'med-123',
          nullable: '',
        },
      }),
    });

    expect(payload.message.android).toEqual({
      priority: 'high',
      ttl: '30s',
      notification: {
        channel_id: 'pulsewise_reminders',
        sound: 'default',
        default_sound: true,
        notification_priority: 'PRIORITY_HIGH',
      },
    });

    expect(payload.message.apns).toEqual({
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          sound: 'default',
          'content-available': 1,
        },
      },
    });

    expect(payload.message.webpush).toEqual({
      headers: {
        Urgency: 'high',
        TTL: '30',
      },
    });
  });
});
