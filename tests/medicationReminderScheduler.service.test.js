jest.mock('../src/config/env', () => ({
  isTest: false,
  schedulers: {
    enabled: true,
    medicationReminderEnabled: true,
    timeZone: 'Asia/Jakarta',
    medicationReminderLookbackMinutes: 2,
    medicationReminderTickMs: 60000,
  },
}));

jest.mock('../src/repositories/medicationReminderRepository', () => ({
  listDueMedicationReminderCandidates: jest.fn(),
}));

jest.mock('../src/repositories/pushNotificationLogRepository', () => ({
  findPushNotificationLogByDedupeKey: jest.fn(),
}));

jest.mock('../src/services/medication/reminderNotificationService', () => ({
  buildMedicationReminderDedupeKey: jest.fn(),
  sendMedicationReminderNotificationInternal: jest.fn(),
}));

const medicationReminderRepository = require('../src/repositories/medicationReminderRepository');
const pushNotificationLogRepository = require('../src/repositories/pushNotificationLogRepository');
const reminderNotificationService = require('../src/services/medication/reminderNotificationService');
const schedulerService = require('../src/services/medication/reminderSchedulerService');

describe('medication reminder scheduler service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('buildSchedulerSlots returns current minute and grace lookback minute', () => {
    const slots = schedulerService.buildSchedulerSlots(
      new Date('2026-05-17T01:05:44.000Z'),
      2,
      'Asia/Jakarta'
    );

    expect(slots).toEqual([
      {
        at: new Date('2026-05-17T01:04:44.000Z'),
        scheduledDate: '2026-05-17',
        scheduledTime: '08:04',
        dayOfWeek: 7,
      },
      {
        at: new Date('2026-05-17T01:05:44.000Z'),
        scheduledDate: '2026-05-17',
        scheduledTime: '08:05',
        dayOfWeek: 7,
      },
    ]);
  });

  test('processMedicationReminderWindow sends due reminders and skips duplicates', async () => {
    const candidateFirst = {
      userId: '11111111-1111-4111-8111-111111111111',
      medicationId: '22222222-2222-4222-8222-222222222222',
      reminderId: '33333333-3333-4333-8333-333333333333',
      medication: {
        medicationId: '22222222-2222-4222-8222-222222222222',
        name: 'Paracetamol',
        singleDose: 2,
        singleDoseUnit: 'tablet',
        color: '#e64060',
      },
      scheduleTime: new Date('1970-01-01T08:04:00.000Z'),
    };
    const candidateSecond = {
      userId: '11111111-1111-4111-8111-111111111111',
      medicationId: '44444444-4444-4444-8444-444444444444',
      reminderId: '55555555-5555-4555-8555-555555555555',
      medication: {
        medicationId: '44444444-4444-4444-8444-444444444444',
        name: 'Furosemide',
        singleDose: 1,
        singleDoseUnit: 'tablet',
        color: '#0088ff',
      },
      scheduleTime: new Date('1970-01-01T08:05:00.000Z'),
    };

    medicationReminderRepository.listDueMedicationReminderCandidates
      .mockResolvedValueOnce([candidateFirst])
      .mockResolvedValueOnce([candidateSecond]);
    reminderNotificationService.buildMedicationReminderDedupeKey
      .mockReturnValueOnce('dedupe-0804')
      .mockReturnValueOnce('dedupe-0805');
    pushNotificationLogRepository.findPushNotificationLogByDedupeKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        notificationLogId: 'already-sent',
      });

    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const result = await schedulerService.processMedicationReminderWindow({
      now: new Date('2026-05-17T01:05:44.000Z'),
      logger,
    });

    expect(medicationReminderRepository.listDueMedicationReminderCandidates).toHaveBeenNthCalledWith(
      1,
      {
        scheduledDate: '2026-05-17',
        scheduledTime: '08:04',
        dayOfWeek: 7,
      }
    );
    expect(medicationReminderRepository.listDueMedicationReminderCandidates).toHaveBeenNthCalledWith(
      2,
      {
        scheduledDate: '2026-05-17',
        scheduledTime: '08:05',
        dayOfWeek: 7,
      }
    );
    expect(reminderNotificationService.sendMedicationReminderNotificationInternal).toHaveBeenCalledTimes(
      1
    );
    expect(reminderNotificationService.sendMedicationReminderNotificationInternal).toHaveBeenCalledWith({
      userId: '11111111-1111-4111-8111-111111111111',
      medication: candidateFirst.medication,
      reminder: candidateFirst,
      payload: {
        scheduledDate: '2026-05-17',
        scheduledTime: '08:04',
        status: 'Open',
      },
      dedupeKey: 'dedupe-0804',
    });
    expect(result).toEqual({
      scheduledCount: 1,
      skippedCount: 1,
      failedCount: 0,
      slotCount: 2,
    });
  });

  test('processMedicationReminderWindow keeps going when one reminder delivery fails', async () => {
    const candidateFirst = {
      userId: '11111111-1111-4111-8111-111111111111',
      medicationId: '22222222-2222-4222-8222-222222222222',
      reminderId: '33333333-3333-4333-8333-333333333333',
      medication: {
        medicationId: '22222222-2222-4222-8222-222222222222',
        name: 'Paracetamol',
      },
      scheduleTime: new Date('1970-01-01T08:05:00.000Z'),
    };
    const candidateSecond = {
      userId: '99999999-9999-4999-8999-999999999999',
      medicationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      reminderId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      medication: {
        medicationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        name: 'Spironolactone',
      },
      scheduleTime: new Date('1970-01-01T08:05:00.000Z'),
    };

    medicationReminderRepository.listDueMedicationReminderCandidates
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([candidateFirst, candidateSecond]);
    reminderNotificationService.buildMedicationReminderDedupeKey
      .mockReturnValueOnce('dedupe-fail')
      .mockReturnValueOnce('dedupe-success');
    pushNotificationLogRepository.findPushNotificationLogByDedupeKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    reminderNotificationService.sendMedicationReminderNotificationInternal
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        sentCount: 1,
      });

    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const result = await schedulerService.processMedicationReminderWindow({
      now: new Date('2026-05-17T01:05:44.000Z'),
      logger,
    });

    expect(reminderNotificationService.sendMedicationReminderNotificationInternal).toHaveBeenCalledTimes(
      2
    );
    expect(result).toEqual({
      scheduledCount: 1,
      skippedCount: 0,
      failedCount: 1,
      slotCount: 2,
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
