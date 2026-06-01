jest.mock('../src/config/prisma', () => ({
  $accelerate: {
    invalidate: jest.fn(),
  },
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
    createMany: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const medicationService = require('../src/services/medicationService');

describe('medication pagination', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
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
        cacheStrategy: expect.objectContaining({
          ttl: 60,
          swr: 120,
          tags: ['medications_user_user_1'],
        }),
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
        cacheStrategy: expect.objectContaining({
          ttl: 60,
          swr: 120,
          tags: ['medications_user_user_1', 'medication_item_med_1', 'reminders_medication_med_1'],
        }),
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
    jest.useFakeTimers().setSystemTime(new Date('2026-04-11T02:00:00.000Z'));

    prisma.medication.findFirst.mockResolvedValue({
      medicationId: 'med-1',
      userId: 'user-1',
    });
    prisma.medication.findMany.mockResolvedValue([
      {
        medicationId: 'med-1',
        userId: 'user-1',
        name: 'Aspirin',
        color: 'white',
        singleDose: '1',
        singleDoseUnit: 'tablet',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        frequency: 'daily',
        numOfDays: 1,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        reminders: [
          {
            reminderId: 'rem-1',
            userId: 'user-1',
            medicationId: 'med-1',
            scheduleTime: new Date('1970-01-01T08:15:00.000Z'),
            dayOfWeek: null,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
          },
        ],
      },
    ]);
    prisma.medicationLog.findMany.mockResolvedValue([
      {
        medicationLogId: 'log-1',
        userId: 'user-1',
        medicationId: 'med-1',
        status: 'skipped',
        medicationDate: new Date('2026-04-10T00:00:00.000Z'),
        medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        createdAt: new Date('2026-04-10T08:15:00.000Z'),
      },
    ]);
    prisma.medicationLog.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

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

    expect(prisma.medicationLog.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          medicationId: 'med-1',
          status: 'missed',
          medicationDate: new Date('2026-04-01T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-1',
          status: 'missed',
          medicationDate: new Date('2026-04-02T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-1',
          status: 'missed',
          medicationDate: new Date('2026-04-03T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-1',
          status: 'missed',
          medicationDate: new Date('2026-04-04T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-1',
          status: 'missed',
          medicationDate: new Date('2026-04-05T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-1',
          status: 'missed',
          medicationDate: new Date('2026-04-06T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-1',
          status: 'missed',
          medicationDate: new Date('2026-04-07T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-1',
          status: 'missed',
          medicationDate: new Date('2026-04-08T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-1',
          status: 'missed',
          medicationDate: new Date('2026-04-09T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:15:00.000Z'),
        },
      ],
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
    expect(result.summary).toEqual({
      taken: 2,
      skipped: 1,
      missed: 2,
    });
    expect(result.items[0].status).toBe('skipped');
    expect(result.items[0].medicationTime).toBe('08:15');
  });

  test('listMedicationLogs clamps pagination metadata when requested page exceeds total pages', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-11T02:00:00.000Z'));

    prisma.medication.findFirst.mockResolvedValue({
      medicationId: 'med-1',
      userId: 'user-1',
    });
    prisma.medication.findMany.mockResolvedValue([]);
    prisma.medicationLog.findMany.mockResolvedValue([]);
    prisma.medicationLog.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await medicationService.listMedicationLogs({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      medicationId: 'med-1',
      query: {
        page: 2,
        limit: 20,
        startDate: '2026-04-01',
        endDate: '2026-04-10',
      },
    });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 1,
    });
    expect(result.summary).toEqual({
      taken: 0,
      skipped: 0,
      missed: 0,
    });
  });

  test('listMedications coerces string pagination input before Prisma call', async () => {
    prisma.medication.findMany.mockResolvedValue([]);
    prisma.medication.count.mockResolvedValue(0);

    const result = await medicationService.listMedications({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: { page: '1', limit: '20' },
    });

    expect(prisma.medication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        cacheStrategy: expect.objectContaining({
          ttl: 60,
          swr: 120,
        }),
      })
    );
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 1,
    });
  });

  test('listMedicationCalendar expands daily reminders for every date in range and weekly reminders by weekday', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-16T02:00:00.000Z'));

    prisma.medication.findMany.mockResolvedValue([
      {
        medicationId: 'med-daily',
        userId: 'user-1',
        name: 'Aspirin',
        color: 'white',
        singleDose: '1',
        singleDoseUnit: 'tablet',
        startDate: new Date('2026-04-10T00:00:00.000Z'),
        frequency: 'daily',
        numOfDays: 1,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        reminders: [
          {
            reminderId: 'rem-daily',
            userId: 'user-1',
            medicationId: 'med-daily',
            scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
            dayOfWeek: null,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
          },
        ],
      },
      {
        medicationId: 'med-weekly',
        userId: 'user-1',
        name: 'Vitamin C',
        color: 'orange',
        singleDose: '2',
        singleDoseUnit: 'capsule',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        frequency: 'weekly',
        numOfDays: null,
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        reminders: [
          {
            reminderId: 'rem-weekly',
            userId: 'user-1',
            medicationId: 'med-weekly',
            scheduleTime: new Date('1970-01-01T09:30:00.000Z'),
            dayOfWeek: 1,
            createdAt: new Date('2026-04-02T00:00:00.000Z'),
          },
        ],
      },
    ]);
    prisma.medicationLog.findMany.mockResolvedValue([
      {
        medicationLogId: 'log-1',
        userId: 'user-1',
        medicationId: 'med-daily',
        status: 'taken',
        medicationDate: new Date('2026-04-11T00:00:00.000Z'),
        medicationTime: new Date('1970-01-01T08:00:00.000Z'),
        createdAt: new Date('2026-04-11T08:05:00.000Z'),
      },
    ]);
    prisma.medicationLog.findMany
      .mockResolvedValueOnce([
        {
          medicationLogId: 'log-1',
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'taken',
          medicationDate: new Date('2026-04-11T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
          createdAt: new Date('2026-04-11T08:05:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          medicationLogId: 'log-1',
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'taken',
          medicationDate: new Date('2026-04-11T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
          createdAt: new Date('2026-04-11T08:05:00.000Z'),
        },
        {
          medicationLogId: 'log-missed-0410',
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-10T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
          createdAt: new Date('2026-04-16T02:00:00.000Z'),
        },
        {
          medicationLogId: 'log-missed-0412',
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-12T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
          createdAt: new Date('2026-04-16T02:00:00.000Z'),
        },
        {
          medicationLogId: 'log-missed-0413',
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-13T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
          createdAt: new Date('2026-04-16T02:00:00.000Z'),
        },
        {
          medicationLogId: 'log-missed-0414',
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-14T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
          createdAt: new Date('2026-04-16T02:00:00.000Z'),
        },
        {
          medicationLogId: 'log-missed-0415',
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-15T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
          createdAt: new Date('2026-04-16T02:00:00.000Z'),
        },
        {
          medicationLogId: 'log-missed-weekly-0413',
          userId: 'user-1',
          medicationId: 'med-weekly',
          status: 'missed',
          medicationDate: new Date('2026-04-13T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T09:30:00.000Z'),
          createdAt: new Date('2026-04-16T02:00:00.000Z'),
        },
      ]);

    const result = await medicationService.listMedicationCalendar({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: {
        from: '2026-04-10',
        to: '2026-04-15',
      },
    });

    expect(prisma.medication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
        }),
      })
    );
    expect(prisma.medicationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          medicationId: {
            in: ['med-daily', 'med-weekly'],
          },
          medicationDate: {
            gte: new Date('2026-04-10T00:00:00.000Z'),
            lte: new Date('2026-04-15T00:00:00.000Z'),
          },
        },
      })
    );
    expect(prisma.medicationLog.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-10T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-12T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-13T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-14T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-daily',
          status: 'missed',
          medicationDate: new Date('2026-04-15T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T08:00:00.000Z'),
        },
        {
          userId: 'user-1',
          medicationId: 'med-weekly',
          status: 'missed',
          medicationDate: new Date('2026-04-13T00:00:00.000Z'),
          medicationTime: new Date('1970-01-01T09:30:00.000Z'),
        },
      ],
    });
    expect(result.range).toEqual({
      from: '2026-04-10',
      to: '2026-04-15',
    });
    expect(result.totalItems).toBe(7);
    expect(result.items).toEqual([
      expect.objectContaining({
        eventId: 'rem-daily:2026-04-10',
        scheduledDate: '2026-04-10',
        scheduledTime: '08:00',
        status: 'missed',
      }),
      expect.objectContaining({
        eventId: 'rem-daily:2026-04-11',
        scheduledDate: '2026-04-11',
        scheduledTime: '08:00',
        status: 'taken',
        medicationLogId: 'log-1',
      }),
      expect.objectContaining({
        eventId: 'rem-daily:2026-04-12',
        scheduledDate: '2026-04-12',
        scheduledTime: '08:00',
        status: 'missed',
      }),
      expect.objectContaining({
        eventId: 'rem-daily:2026-04-13',
        scheduledDate: '2026-04-13',
        scheduledTime: '08:00',
        status: 'missed',
      }),
      expect.objectContaining({
        eventId: 'rem-weekly:2026-04-13',
        scheduledDate: '2026-04-13',
        scheduledTime: '09:30',
        name: 'Vitamin C',
        color: 'orange',
        status: 'missed',
      }),
      expect.objectContaining({
        eventId: 'rem-daily:2026-04-14',
        scheduledDate: '2026-04-14',
        scheduledTime: '08:00',
        status: 'missed',
      }),
      expect.objectContaining({
        eventId: 'rem-daily:2026-04-15',
        scheduledDate: '2026-04-15',
        scheduledTime: '08:00',
        status: 'missed',
      }),
    ]);
  });
});
