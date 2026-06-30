jest.mock('../src/config/prisma', () => ({
  reminder: {
    findMany: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const medicationReminderRepository = require('../src/repositories/medicationReminderRepository');

describe('medicationReminderRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('listDueMedicationReminderCandidates filters daily reminders by numOfDays interval', async () => {
    prisma.reminder.findMany.mockResolvedValue([
      {
        reminderId: 'rem-daily-match',
        userId: 'user-1',
        medicationId: 'med-daily-match',
        scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
        dayOfWeek: null,
        medication: {
          medicationId: 'med-daily-match',
          frequency: 'daily',
          startDate: new Date('2026-04-10T00:00:00.000Z'),
          numOfDays: 2,
        },
      },
      {
        reminderId: 'rem-daily-skip',
        userId: 'user-1',
        medicationId: 'med-daily-skip',
        scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
        dayOfWeek: null,
        medication: {
          medicationId: 'med-daily-skip',
          frequency: 'daily',
          startDate: new Date('2026-04-11T00:00:00.000Z'),
          numOfDays: 2,
        },
      },
      {
        reminderId: 'rem-weekly',
        userId: 'user-1',
        medicationId: 'med-weekly',
        scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
        dayOfWeek: 1,
        medication: {
          medicationId: 'med-weekly',
          frequency: 'weekly',
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          numOfDays: null,
        },
      },
    ]);

    const result = await medicationReminderRepository.listDueMedicationReminderCandidates({
      scheduledDate: '2026-04-14',
      scheduledTime: '08:00',
      dayOfWeek: 1,
    });

    expect(prisma.reminder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
        }),
      })
    );
    expect(result.map((item) => item.reminderId)).toEqual(['rem-daily-match', 'rem-weekly']);
  });
});
