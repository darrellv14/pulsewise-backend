jest.mock('../src/repositories/patientCareRepository', () => ({
  getHeartDiaryByDate: jest.fn(),
  upsertHeartDiary: jest.fn(),
  createDailySymptom: jest.fn(),
  listDailyBodyMetrics: jest.fn(),
  listDailySymptoms: jest.fn(),
  listDailyActivities: jest.fn(),
  listDailyConsumptions: jest.fn(),
}));

const patientCareRepository = require('../src/repositories/patientCareRepository');
const patientCareService = require('../src/services/patientCareService');
const {
  heartDiaryByDateQuerySchema,
  symptomCreateByDateSchema,
} = require('../src/validators/patientCareValidator');

describe('patient care by-date flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('heartDiaryByDateQuerySchema requires YYYY-MM-DD date query', () => {
    expect(heartDiaryByDateQuerySchema.parse({ date: '2026-04-11' })).toEqual({
      date: '2026-04-11',
    });

    expect(() => heartDiaryByDateQuerySchema.parse({})).toThrow();
  });

  test('symptomCreateByDateSchema requires diaryDate plus existing symptom payload', () => {
    expect(
      symptomCreateByDateSchema.parse({
        diaryDate: '2026-04-11',
        symptomName: 'Pusing',
        intensity: 4,
      })
    ).toEqual({
      diaryDate: '2026-04-11',
      symptomName: 'Pusing',
      intensity: 4,
    });
  });

  test('getHeartDiaryByDate returns null when diary does not exist', async () => {
    patientCareRepository.getHeartDiaryByDate.mockResolvedValue(null);

    const result = await patientCareService.getHeartDiaryByDate({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      diaryDate: '2026-04-11',
    });

    expect(patientCareRepository.getHeartDiaryByDate).toHaveBeenCalledWith({
      userId: 'user-1',
      diaryDate: '2026-04-11',
    });
    expect(result).toBeNull();
  });

  test('getHeartDiaryByDate returns detailed diary when diary exists', async () => {
    patientCareRepository.getHeartDiaryByDate.mockResolvedValue({
      diary_id: 'diary-1',
      user_id: 'user-1',
      diary_date: '2026-04-11',
      created_at: '2026-04-11T01:00:00.000Z',
    });
    patientCareRepository.listDailyBodyMetrics.mockResolvedValue([]);
    patientCareRepository.listDailySymptoms.mockResolvedValue([
      {
        symptom_id: 'symptom-1',
        diary_id: 'diary-1',
        symptom_name: 'Pusing',
        intensity: 4,
        note: 'Pagi hari',
        time_stamp: '2026-04-11T07:00:00.000Z',
      },
    ]);
    patientCareRepository.listDailyActivities.mockResolvedValue([]);
    patientCareRepository.listDailyConsumptions.mockResolvedValue([]);

    const result = await patientCareService.getHeartDiaryByDate({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      diaryDate: '2026-04-11',
    });

    expect(result).toMatchObject({
      diaryId: 'diary-1',
      userId: 'user-1',
      diaryDate: '2026-04-11',
      symptoms: [
        {
          symptomId: 'symptom-1',
          diaryId: 'diary-1',
          symptomName: 'Pusing',
        },
      ],
      bodyMetrics: [],
      activities: [],
      consumptions: [],
    });
  });

  test('createDailySymptomByDate upserts diary first and reuses returned diaryId', async () => {
    patientCareRepository.upsertHeartDiary.mockResolvedValue({
      diary_id: 'diary-1',
      user_id: 'user-1',
      diary_date: '2026-04-11',
      created_at: '2026-04-11T01:00:00.000Z',
    });
    patientCareRepository.createDailySymptom.mockResolvedValue({
      symptom_id: 'symptom-1',
      diary_id: 'diary-1',
      symptom_name: 'Pusing',
      intensity: 4,
      note: 'Pagi hari',
      time_stamp: '2026-04-11T07:00:00.000Z',
    });

    const result = await patientCareService.createDailySymptomByDate({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        diaryDate: '2026-04-11',
        symptomName: 'Pusing',
        intensity: 4,
        note: 'Pagi hari',
      },
    });

    expect(patientCareRepository.upsertHeartDiary).toHaveBeenCalledWith({
      userId: 'user-1',
      diaryDate: '2026-04-11',
    });
    expect(patientCareRepository.createDailySymptom).toHaveBeenCalledWith({
      diaryId: 'diary-1',
      symptomName: 'Pusing',
      intensity: 4,
      note: 'Pagi hari',
      timeStamp: null,
    });
    expect(result).toMatchObject({
      symptomId: 'symptom-1',
      diaryId: 'diary-1',
      symptomName: 'Pusing',
      intensity: 4,
    });
  });
});
