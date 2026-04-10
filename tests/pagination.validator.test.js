const {
  medicationListQuerySchema,
  reminderListQuerySchema,
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

  test('legacy list queries default page and limit', () => {
    expect(emergencyContactListQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(heartDiaryQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });
});
