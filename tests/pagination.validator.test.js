const {
  medicationListQuerySchema,
  reminderListQuerySchema,
  medicationCalendarQuerySchema,
  medicationLogQuerySchema,
} = require('../src/validators/medicationValidator');
const {
  emergencyContactListQuerySchema,
  heartDiaryQuerySchema,
} = require('../src/validators/patientCareValidator');

describe('pagination validators', () => {
  test('medication list/reminder queries default page and limit', () => {
    expect(medicationListQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(reminderListQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  test('medication log query accepts pagination with date range', () => {
    expect(
      medicationLogQuerySchema.parse({
        page: '2',
        limit: '10',
        startDate: '2026-04-01',
        endDate: '2026-04-10',
      })
    ).toEqual({
      page: 2,
      limit: 10,
      startDate: '2026-04-01',
      endDate: '2026-04-10',
    });
  });

  test('medication calendar query accepts valid range and rejects oversized range', () => {
    expect(
      medicationCalendarQuerySchema.parse({
        from: '2026-04-01',
        to: '2026-04-30',
      })
    ).toEqual({
      from: '2026-04-01',
      to: '2026-04-30',
    });

    expect(() =>
      medicationCalendarQuerySchema.parse({
        from: '2026-01-01',
        to: '2026-04-15',
      })
    ).toThrow('Rentang kalender maksimal 93 hari');
  });

  test('legacy list queries default page and limit', () => {
    expect(emergencyContactListQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(heartDiaryQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });
});
