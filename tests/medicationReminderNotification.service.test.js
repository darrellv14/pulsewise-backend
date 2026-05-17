jest.mock('../src/config/prisma', () => ({}));

jest.mock('../src/services/notificationService', () => ({
  deliverNotificationToUser: jest.fn(),
}));

jest.mock('../src/services/medication/persistenceService', () => ({
  loadMedicationWithReminders: jest.fn(),
}));

const notificationService = require('../src/services/notificationService');
const { loadMedicationWithReminders } = require('../src/services/medication/persistenceService');
const medicationService = require('../src/services/medicationService');

describe('medication reminder notification service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('sends medication reminder payload with reminderId match', async () => {
    loadMedicationWithReminders.mockResolvedValue({
      medicationId: '0f282e3e-2d3c-494b-bc6f-e204c7e3e3d5',
      userId: '11111111-1111-4111-8111-111111111111',
      name: 'Paracetamol',
      color: '#e64060',
      singleDose: 2,
      singleDoseUnit: 'tablet',
      reminders: [
        {
          reminderId: '22222222-2222-4222-8222-222222222222',
          scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
        },
      ],
    });
    notificationService.deliverNotificationToUser.mockResolvedValue({
      userId: '11111111-1111-4111-8111-111111111111',
      notificationType: 'medication_reminder',
      sentCount: 1,
      failedCount: 0,
      results: [],
    });

    const result = await medicationService.sendMedicationReminderNotification({
      actor: {
        userId: '11111111-1111-4111-8111-111111111111',
        role: 'patient',
      },
      userId: '11111111-1111-4111-8111-111111111111',
      medicationId: '0f282e3e-2d3c-494b-bc6f-e204c7e3e3d5',
      payload: {
        reminderId: '22222222-2222-4222-8222-222222222222',
        scheduledDate: '2026-05-17',
        status: 'Open',
      },
    });

    expect(notificationService.deliverNotificationToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '11111111-1111-4111-8111-111111111111',
        notificationType: 'medication_reminder',
        title: 'Waktunya minum obat',
        body: 'Paracetamol dijadwalkan pukul 08:00',
        data: expect.objectContaining({
          action: 'open_medication_reminder',
          type: 'medication_reminder',
          medicationId: '0f282e3e-2d3c-494b-bc6f-e204c7e3e3d5',
          reminderId: '22222222-2222-4222-8222-222222222222',
          scheduledDate: '2026-05-17',
          scheduledTime: '08:00',
          status: 'Open',
          medicationName: 'Paracetamol',
        }),
      })
    );
    expect(result.sentCount).toBe(1);
  });

  test('rejects when reminder cannot be resolved', async () => {
    loadMedicationWithReminders.mockResolvedValue({
      medicationId: '0f282e3e-2d3c-494b-bc6f-e204c7e3e3d5',
      reminders: [
        {
          reminderId: '22222222-2222-4222-8222-222222222222',
          scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
        },
      ],
    });

    await expect(
      medicationService.sendMedicationReminderNotification({
        actor: {
          userId: '11111111-1111-4111-8111-111111111111',
          role: 'patient',
        },
        userId: '11111111-1111-4111-8111-111111111111',
        medicationId: '0f282e3e-2d3c-494b-bc6f-e204c7e3e3d5',
        payload: {
          reminderId: '33333333-3333-4333-8333-333333333333',
          scheduledDate: '2026-05-17',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Reminder tidak ditemukan pada medication ini',
    });
  });
});
