jest.mock('../src/config/prisma', () => ({
  medication: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  reminder: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  medicationLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const medicationService = require('../src/services/medicationService');

describe('medication pagination', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('listMedications returns paginated items and metadata', async () => {
    prisma.medication.findMany.mockResolvedValue([
      {
        medicationId: 'med-1',
        userId: 'user-1',
        name: 'Aspirin',
        description: 'Obat harian',
        conditionTag: 'heart',
        createdAt: new Date('2026-04-11T00:00:00.000Z'),
        reminders: [
          {
            reminderId: 'rem-1',
            userId: 'user-1',
            medicationId: 'med-1',
            scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
            createdAt: new Date('2026-04-11T00:10:00.000Z'),
          },
        ],
      },
    ]);
    prisma.medication.count.mockResolvedValue(3);

    const result = await medicationService.listMedications({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: { page: 2, limit: 1 },
    });

    expect(prisma.medication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        skip: 1,
        take: 1,
      })
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 1,
      totalItems: 3,
      totalPages: 3,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].reminders[0].scheduleTime).toBe('08:00');
  });

  test('listRemindersByMedication paginates reminders per medication', async () => {
    prisma.medication.findFirst.mockResolvedValue({
      medicationId: 'med-1',
      userId: 'user-1',
    });
    prisma.reminder.findMany.mockResolvedValue([
      {
        reminderId: 'rem-2',
        userId: 'user-1',
        medicationId: 'med-1',
        scheduleTime: new Date('1970-01-01T13:30:00.000Z'),
        createdAt: new Date('2026-04-11T01:00:00.000Z'),
      },
    ]);
    prisma.reminder.count.mockResolvedValue(4);

    const result = await medicationService.listRemindersByMedication({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      medicationId: 'med-1',
      query: { page: 2, limit: 1 },
    });

    expect(prisma.reminder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', medicationId: 'med-1' },
        skip: 1,
        take: 1,
      })
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 1,
      totalItems: 4,
      totalPages: 4,
    });
    expect(result.items[0].scheduleTime).toBe('13:30');
  });

  test('listMedicationLogs paginates logs and preserves date filters', async () => {
    prisma.medication.findFirst.mockResolvedValue({
      medicationId: 'med-1',
      userId: 'user-1',
    });
    prisma.medicationLog.findMany.mockResolvedValue([
      {
        medicationLogId: 'log-1',
        userId: 'user-1',
        medicationId: 'med-1',
        medicationDate: new Date('2026-04-10T00:00:00.000Z'),
        medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        createdAt: new Date('2026-04-10T08:15:00.000Z'),
      },
    ]);
    prisma.medicationLog.count.mockResolvedValue(5);

    const result = await medicationService.listMedicationLogs({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      medicationId: 'med-1',
      query: {
        page: 2,
        limit: 2,
        startDate: '2026-04-01',
        endDate: '2026-04-10',
      },
    });

    expect(prisma.medicationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          medicationId: 'med-1',
          medicationDate: {
            gte: new Date('2026-04-01T00:00:00.000Z'),
            lte: new Date('2026-04-10T00:00:00.000Z'),
          },
        },
        skip: 2,
        take: 2,
      })
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 2,
      totalItems: 5,
      totalPages: 3,
    });
    expect(result.items[0].medicationTime).toBe('08:15');
  });
});
