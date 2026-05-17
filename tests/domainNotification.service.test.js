jest.mock('../src/repositories/pushNotificationLogRepository', () => ({
  findPushNotificationLogByDedupeKey: jest.fn(),
}));

jest.mock('../src/services/notification/fcmDeliveryService', () => ({
  deliverNotificationToUser: jest.fn(),
}));

const pushNotificationLogRepository = require('../src/repositories/pushNotificationLogRepository');
const { deliverNotificationToUser } = require('../src/services/notification/fcmDeliveryService');
const domainNotificationService = require('../src/services/notification/domainNotificationService');

describe('domain notification service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('sendAbnormalVitalAlertBestEffort sends alert for dangerous SpO2', async () => {
    pushNotificationLogRepository.findPushNotificationLogByDedupeKey.mockResolvedValueOnce(null);
    deliverNotificationToUser.mockResolvedValueOnce({ sentCount: 1 });

    const result = await domainNotificationService.sendAbnormalVitalAlertBestEffort({
      userId: '11111111-1111-4111-8111-111111111111',
      reading: {
        reading_id: '22222222-2222-4222-8222-222222222222',
        metric_type: 'spo2',
        value_numeric: 89,
        unit: '%',
        measured_at: '2026-05-17T10:00:00.000Z',
      },
    });

    expect(deliverNotificationToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '11111111-1111-4111-8111-111111111111',
        notificationType: 'abnormal_vital_alert',
        data: expect.objectContaining({
          action: 'open_abnormal_vital_alert',
          metric: 'oxygen_saturation',
          severity: 'critical',
        }),
      })
    );
    expect(result).toBe(true);
  });

  test('sendAbnormalVitalAlertBestEffort skips normal heart rate', async () => {
    const result = await domainNotificationService.sendAbnormalVitalAlertBestEffort({
      userId: '11111111-1111-4111-8111-111111111111',
      reading: {
        reading_id: '22222222-2222-4222-8222-222222222222',
        metric_type: 'heart_rate',
        value_numeric: 72,
        unit: 'bpm',
        measured_at: '2026-05-17T10:00:00.000Z',
      },
    });

    expect(deliverNotificationToUser).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  test('sendMlResultReadyNotificationBestEffort sends patient ML ready notification', async () => {
    pushNotificationLogRepository.findPushNotificationLogByDedupeKey.mockResolvedValueOnce(null);
    deliverNotificationToUser.mockResolvedValueOnce({ sentCount: 1 });

    const result = await domainNotificationService.sendMlResultReadyNotificationBestEffort({
      patientId: '11111111-1111-4111-8111-111111111111',
      inferenceType: 'recommendation',
      result: {
        resultId: '33333333-3333-4333-8333-333333333333',
        generatedAt: '2026-05-17T10:00:00.000Z',
        requestContext: 'patient',
      },
    });

    expect(deliverNotificationToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '11111111-1111-4111-8111-111111111111',
        notificationType: 'ml_result_ready',
        data: expect.objectContaining({
          action: 'open_ml_result',
          inferenceType: 'recommendation',
          resultId: '33333333-3333-4333-8333-333333333333',
        }),
      })
    );
    expect(result).toBe(true);
  });
});
