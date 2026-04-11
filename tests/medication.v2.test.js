jest.mock('../src/config/prisma', () => ({
  $transaction: jest.fn(),
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
const {
  medicationCreateSchema,
  medicationUpdateSchema,
  reminderCreateSchema,
} = require('../src/validators/medicationValidator');

describe('medication v2', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('medicationCreateSchema accepts daily payload', () => {
    expect(
      medicationCreateSchema.parse({
        name: 'Aspirin',
        startDate: '2026-04-11',
        frequency: 'daily',
        numOfDays: 7,
        intakeTimes: ['08:00', '20:00'],
      })
    ).toMatchObject({
      frequency: 'daily',
      numOfDays: 7,
      intakeTimes: ['08:00', '20:00'],
    });
  });

  test('medicationCreateSchema accepts weekly payload', () => {
    expect(
      medicationCreateSchema.parse({
        name: 'Obat A',
        startDate: '2026-04-11',
        frequency: 'weekly',
        daysOfWeek: [1, 3, 5],
        intakeTimes: ['08:00'],
      })
    ).toMatchObject({
      frequency: 'weekly',
      daysOfWeek: [1, 3, 5],
    });
  });

  test('medicationUpdateSchema rejects daily frequency with daysOfWeek in the same request', () => {
    expect(() =>
      medicationUpdateSchema.parse({
        frequency: 'daily',
        daysOfWeek: [1, 3],
      })
    ).toThrow();
  });

  test('reminderCreateSchema accepts weekly reminder with dayOfWeek', () => {
    expect(
      reminderCreateSchema.parse({
        scheduleTime: '13:30',
        dayOfWeek: 1,
      })
    ).toEqual({
      scheduleTime: '13:30',
      dayOfWeek: 1,
    });
  });

  test('createMedication builds daily reminder rows and returns V2 dto', async () => {
    const tx = {
      medication: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      reminder: {
        createMany: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    tx.medication.create.mockResolvedValue({
      medicationId: 'med-1',
    });
    tx.reminder.createMany.mockResolvedValue({ count: 2 });
    tx.medication.findUnique.mockResolvedValue({
      medicationId: 'med-1',
      userId: 'user-1',
      name: 'Aspirin',
      description: null,
      conditionTag: null,
      form: 'tablet',
      color: 'white',
      singleDose: '1',
      singleDoseUnit: 'tablet',
      startDate: new Date('2026-04-11T00:00:00.000Z'),
      frequency: 'daily',
      numOfDays: 7,
      note: 'Setelah makan',
      createdAt: new Date('2026-04-11T00:00:00.000Z'),
      reminders: [
        {
          reminderId: 'rem-1',
          userId: 'user-1',
          medicationId: 'med-1',
          scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
          dayOfWeek: null,
          createdAt: new Date('2026-04-11T00:10:00.000Z'),
        },
        {
          reminderId: 'rem-2',
          userId: 'user-1',
          medicationId: 'med-1',
          scheduleTime: new Date('1970-01-01T20:00:00.000Z'),
          dayOfWeek: null,
          createdAt: new Date('2026-04-11T00:10:00.000Z'),
        },
      ],
    });

    const result = await medicationService.createMedication({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        name: 'Aspirin',
        form: 'tablet',
        color: 'white',
        singleDose: 1,
        singleDoseUnit: 'tablet',
        startDate: '2026-04-11',
        frequency: 'daily',
        numOfDays: 7,
        intakeTimes: ['08:00', '20:00'],
        note: 'Setelah makan',
      },
    });

    expect(tx.medication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          frequency: 'daily',
          numOfDays: 7,
          startDate: new Date('2026-04-11T00:00:00.000Z'),
        }),
      })
    );
    expect(tx.reminder.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          medicationId: 'med-1',
          scheduleTime: new Date('1970-01-01T08:00:00.000Z'),
          dayOfWeek: null,
        },
        {
          userId: 'user-1',
          medicationId: 'med-1',
          scheduleTime: new Date('1970-01-01T20:00:00.000Z'),
          dayOfWeek: null,
        },
      ],
    });
    expect(result).toMatchObject({
      medicationId: 'med-1',
      form: 'tablet',
      color: 'white',
      singleDose: 1,
      singleDoseUnit: 'tablet',
      startDate: '2026-04-11',
      frequency: 'daily',
      numOfDays: 7,
      intakeTimes: ['08:00', '20:00'],
      daysOfWeek: [],
      note: 'Setelah makan',
    });
  });
});
