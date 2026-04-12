jest.mock('../src/repositories/patientCareRepository', () => ({
  getHeartDiaryByDate: jest.fn(),
  upsertHeartDiary: jest.fn(),
  getLatestDailyBodyMetric: jest.fn(),
  createDailyBodyMetric: jest.fn(),
  updateDailyBodyMetric: jest.fn(),
  createDailySymptom: jest.fn(),
  createDailyConsumption: jest.fn(),
  listDailyBodyMetrics: jest.fn(),
  listDailySymptoms: jest.fn(),
  listDailyActivities: jest.fn(),
  listDailyConsumptions: jest.fn(),
}));

const patientCareRepository = require('../src/repositories/patientCareRepository');
const patientCareService = require('../src/services/patientCareService');
const {
  heartDiaryByDateQuerySchema,
  bodyMetricCreateByDateSchema,
  symptomCreateByDateSchema,
  consumptionCreateByDateSchema,
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
        time: '07:30',
      })
    ).toEqual({
      diaryDate: '2026-04-11',
      symptomName: 'Pusing',
      intensity: 4,
      time: '07:30',
    });
  });

  test('consumptionCreateByDateSchema accepts time payload for intake time', () => {
    expect(
      consumptionCreateByDateSchema.parse({
        diaryDate: '2026-04-11',
        type: 'medication',
        name: 'Aspirin',
        time: '21:15',
      })
    ).toEqual({
      diaryDate: '2026-04-11',
      type: 'medication',
      name: 'Aspirin',
      time: '21:15',
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
        time: '07:30',
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
      timeStamp: '2026-04-11T07:30:00.000Z',
    });
    expect(result).toMatchObject({
      symptomId: 'symptom-1',
      diaryId: 'diary-1',
      symptomName: 'Pusing',
      intensity: 4,
    });
  });

  test('createDailyConsumptionByDate converts time into timestamp on the diary date', async () => {
    patientCareRepository.upsertHeartDiary.mockResolvedValue({
      diary_id: 'diary-1',
      user_id: 'user-1',
      diary_date: '2026-04-11',
      created_at: '2026-04-11T01:00:00.000Z',
    });
    patientCareRepository.createDailyConsumption.mockResolvedValue({
      consumption_id: 'consumption-1',
      diary_id: 'diary-1',
      type: 'medication',
      name: 'Aspirin',
      portion: '1 tablet',
      note: 'Sesudah makan malam',
      time_stamp: '2026-04-11T21:15:00.000Z',
    });

    const result = await patientCareService.createDailyConsumptionByDate({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        diaryDate: '2026-04-11',
        type: 'medication',
        name: 'Aspirin',
        portion: '1 tablet',
        note: 'Sesudah makan malam',
        time: '21:15',
      },
    });

    expect(patientCareRepository.createDailyConsumption).toHaveBeenCalledWith({
      diaryId: 'diary-1',
      type: 'medication',
      name: 'Aspirin',
      portion: '1 tablet',
      note: 'Sesudah makan malam',
      timeStamp: '2026-04-11T21:15:00.000Z',
    });
    expect(result).toMatchObject({
      consumptionId: 'consumption-1',
      diaryId: 'diary-1',
      type: 'medication',
      name: 'Aspirin',
      time: '21:15',
    });
  });

  test('bodyMetricCreateByDateSchema still allows partial payload for upsert flow', () => {
    expect(
      bodyMetricCreateByDateSchema.parse({
        diaryDate: '2026-04-11',
        bodyWeight: 73.2,
        heartRate: 78,
      })
    ).toEqual({
      diaryDate: '2026-04-11',
      bodyWeight: 73.2,
      heartRate: 78,
    });
  });

  test('createDailyBodyMetricByDate updates the latest metric instead of inserting a new row', async () => {
    patientCareRepository.upsertHeartDiary.mockResolvedValue({
      diary_id: 'diary-1',
      user_id: 'user-1',
      diary_date: '2026-04-11',
      created_at: '2026-04-11T01:00:00.000Z',
    });
    patientCareRepository.getLatestDailyBodyMetric.mockResolvedValue({
      metric_id: 'metric-1',
      diary_id: 'diary-1',
      condition_tag: 'morning',
      body_height: '170.00',
      body_weight: '72.50',
      bmi: '25.10',
      systolic_pressure: 120,
      diastolic_pressure: 80,
      heart_rate: 76,
      time_stamp: '2026-04-11T07:00:00.000Z',
    });
    patientCareRepository.updateDailyBodyMetric.mockResolvedValue({
      metric_id: 'metric-1',
      diary_id: 'diary-1',
      condition_tag: 'morning',
      body_height: '170.00',
      body_weight: '73.20',
      bmi: '25.10',
      systolic_pressure: 120,
      diastolic_pressure: 80,
      heart_rate: 76,
      time_stamp: '2026-04-11T07:00:00.000Z',
    });

    const result = await patientCareService.createDailyBodyMetricByDate({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        diaryDate: '2026-04-11',
        bodyWeight: 73.2,
      },
    });

    expect(patientCareRepository.getLatestDailyBodyMetric).toHaveBeenCalledWith('diary-1');
    expect(patientCareRepository.updateDailyBodyMetric).toHaveBeenCalledWith({
      metricId: 'metric-1',
      conditionTag: undefined,
      bodyHeight: undefined,
      bodyWeight: 73.2,
      bmi: undefined,
      systolicPressure: undefined,
      diastolicPressure: undefined,
      heartRate: undefined,
      timeStamp: undefined,
    });
    expect(patientCareRepository.createDailyBodyMetric).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      metricId: 'metric-1',
      diaryId: 'diary-1',
      bodyWeight: 73.2,
      heartRate: 76,
    });
  });
});
