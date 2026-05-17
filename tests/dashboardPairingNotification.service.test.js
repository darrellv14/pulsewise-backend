jest.mock('../src/repositories/doctorPatientRepository', () => ({
  findDoctorPatientLink: jest.fn(),
  upsertDoctorPatientLink: jest.fn(),
}));

jest.mock('../src/repositories/dashboardPairingRepository', () => ({
  findDashboardPairingSessionByTokenHash: jest.fn(),
  confirmDashboardPairingSessionAtomic: jest.fn(),
  markDashboardPairingSessionExpired: jest.fn(),
}));

jest.mock('../src/repositories/pushNotificationLogRepository', () => ({
  findPushNotificationLogByDedupeKey: jest.fn(),
}));

jest.mock('../src/services/notificationService', () => ({
  deliverNotificationToUser: jest.fn(),
}));

const dashboardPairingRepository = require('../src/repositories/dashboardPairingRepository');
const pushNotificationLogRepository = require('../src/repositories/pushNotificationLogRepository');
const notificationService = require('../src/services/notificationService');
const dashboardPairingService = require('../src/services/dashboardPairingService');

describe('dashboard pairing notification service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('confirmDashboardPairingSession sends confirmed pairing notification best-effort', async () => {
    dashboardPairingRepository.findDashboardPairingSessionByTokenHash.mockResolvedValueOnce({
      pairing_session_id: '11111111-1111-4111-8111-111111111111',
      doctor_id: '22222222-2222-4222-8222-222222222222',
      status: 'pending',
      expires_at: '2099-05-17T10:30:00.000Z',
      confirmed_at: null,
      confirmed_by_patient_id: null,
    });
    dashboardPairingRepository.confirmDashboardPairingSessionAtomic.mockResolvedValueOnce({
      pairingSession: {
        pairing_session_id: '11111111-1111-4111-8111-111111111111',
        doctor_id: '22222222-2222-4222-8222-222222222222',
        status: 'confirmed',
        expires_at: '2099-05-17T10:30:00.000Z',
        confirmed_at: '2026-05-17T10:00:00.000Z',
        confirmed_by_patient_id: '33333333-3333-4333-8333-333333333333',
      },
      doctorPatientLink: {
        doctor_id: '22222222-2222-4222-8222-222222222222',
        patient_id: '33333333-3333-4333-8333-333333333333',
        source: 'qr_dashboard_pairing',
        linked_at: '2026-05-17T10:00:00.000Z',
        is_active: true,
      },
    });
    pushNotificationLogRepository.findPushNotificationLogByDedupeKey.mockResolvedValueOnce(null);
    notificationService.deliverNotificationToUser.mockResolvedValueOnce({
      sentCount: 1,
    });

    const result = await dashboardPairingService.confirmDashboardPairingSession({
      actor: {
        userId: '33333333-3333-4333-8333-333333333333',
        role: 'patient',
      },
      pairingToken: 'PWDASH-ABCDEF0123456789ABCDEF0123456789',
      source: 'qr_dashboard_pairing',
    });

    expect(notificationService.deliverNotificationToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '33333333-3333-4333-8333-333333333333',
        notificationType: 'dashboard_pairing',
        dedupeKey:
          'dashboard_pairing:11111111-1111-4111-8111-111111111111:33333333-3333-4333-8333-333333333333:confirmed',
        data: expect.objectContaining({
          action: 'open_dashboard_pairing',
          type: 'dashboard_pairing',
          pairingSessionId: '11111111-1111-4111-8111-111111111111',
          doctorId: '22222222-2222-4222-8222-222222222222',
          patientId: '33333333-3333-4333-8333-333333333333',
          status: 'confirmed',
        }),
      })
    );
    expect(result.httpStatus).toBe(201);
  });

  test('confirmDashboardPairingSession skips duplicate pairing notification', async () => {
    dashboardPairingRepository.findDashboardPairingSessionByTokenHash
      .mockResolvedValueOnce({
        pairing_session_id: '11111111-1111-4111-8111-111111111111',
        doctor_id: '22222222-2222-4222-8222-222222222222',
        status: 'confirmed',
        expires_at: '2099-05-17T10:30:00.000Z',
        confirmed_at: '2026-05-17T10:00:00.000Z',
        confirmed_by_patient_id: '33333333-3333-4333-8333-333333333333',
      });
    pushNotificationLogRepository.findPushNotificationLogByDedupeKey.mockResolvedValueOnce({
      notificationLogId: 'already-sent',
    });

    const result = await dashboardPairingService.confirmDashboardPairingSession({
      actor: {
        userId: '33333333-3333-4333-8333-333333333333',
        role: 'patient',
      },
      pairingToken: 'PWDASH-ABCDEF0123456789ABCDEF0123456789',
      source: 'qr_dashboard_pairing',
    });

    expect(notificationService.deliverNotificationToUser).not.toHaveBeenCalled();
    expect(result.status).toBe('confirmed');
  });
});
