jest.mock('../src/config/env', () => ({
  nutritionEstimation: {
    enabled: true,
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    model: 'qwen2.5vl:3b',
    timeoutMs: 30000,
    keepAlive: '5m',
    temperature: 0,
  },
}));

jest.mock('../src/repositories/patientCareRepository', () => ({
  createDailyConsumption: jest.fn(),
}));

jest.mock('../src/services/patient-care/diaryService', () => ({
  ensureHeartDiaryByDate: jest.fn(),
}));

jest.mock('../src/services/patient-care/cache', () => ({
  invalidateDiaryCache: jest.fn(),
}));

const patientCareRepository = require('../src/repositories/patientCareRepository');
const { ensureHeartDiaryByDate } = require('../src/services/patient-care/diaryService');
const { invalidateDiaryCache } = require('../src/services/patient-care/cache');
const nutritionEstimationService = require('../src/services/patient-care/nutritionEstimationService');

describe('nutrition estimation service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('estimateNutrition returns validated structured output from Ollama', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          message: {
            content: JSON.stringify({
              detectedFoods: ['white rice', 'beef rendang'],
              portion: '1 plate nasi padang with rice and beef rendang',
              portionGrams: 650,
              nutritionSnapshot: {
                energyKcal: 980,
                proteinG: 35,
                carbohydrateG: 95,
                sugarG: 8,
                fiberG: 10,
                totalFatG: 52,
                saturatedFatG: 20,
                monounsaturatedFatG: 18,
                polyunsaturatedFatG: 6,
                cholesterolMg: 110,
                calciumMg: 160,
              },
              confidence: 0.72,
              assumptions: ['standard nasi padang serving size'],
            }),
          },
          total_duration: 100,
          load_duration: 50,
          prompt_eval_count: 10,
          eval_count: 20,
        }),
    });

    const result = await nutritionEstimationService.estimateNutrition({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        mealName: 'Nasi padang',
        mealDescription: 'Nasi padang dengan rendang',
      },
    });

    expect(result).toMatchObject({
      nutritionSource: 'qwen_ollama',
      model: 'qwen2.5vl:3b',
      portion: '1 plate nasi padang with rice and beef rendang',
      detectedFoods: ['white rice', 'beef rendang'],
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('estimateNutritionAndSaveConsumptionByDate saves estimated nutrition snapshot', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          message: {
            content: JSON.stringify({
              detectedFoods: ['white rice', 'beef rendang'],
              portion: '1 plate nasi padang with rice and beef rendang',
              portionGrams: 650,
              nutritionSnapshot: {
                energyKcal: 980,
                proteinG: 35,
                carbohydrateG: 95,
                sugarG: 8,
                fiberG: 10,
                totalFatG: 52,
                saturatedFatG: 20,
                monounsaturatedFatG: 18,
                polyunsaturatedFatG: 6,
                cholesterolMg: 110,
                calciumMg: 160,
              },
              confidence: 0.72,
              assumptions: ['standard nasi padang serving size'],
            }),
          },
        }),
    });
    ensureHeartDiaryByDate.mockResolvedValueOnce({ diary_id: 'diary-1' });
    patientCareRepository.createDailyConsumption.mockResolvedValueOnce({
      consumptionId: 'cons-1',
      diaryId: 'diary-1',
      type: 'food',
      name: 'Nasi padang',
      portion: '1 plate nasi padang with rice and beef rendang',
      portionGrams: 650,
      fdcFoodId: null,
      nutritionSource: 'qwen_ollama',
      energyKcal: 980,
      proteinG: 35,
      carbohydrateG: 95,
      sugarG: 8,
      fiberG: 10,
      totalFatG: 52,
      saturatedFatG: 20,
      monounsaturatedFatG: 18,
      polyunsaturatedFatG: 6,
      cholesterolMg: 110,
      calciumMg: 160,
      note: 'Detected foods: white rice, beef rendang',
      timeStamp: new Date('2026-05-18T07:30:00.000Z'),
    });

    const result = await nutritionEstimationService.estimateNutritionAndSaveConsumptionByDate({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        diaryDate: '2026-05-18',
        mealName: 'Nasi padang',
        mealDescription: 'Nasi padang dengan rendang',
        type: 'food',
        time: '07:30',
      },
    });

    expect(ensureHeartDiaryByDate).toHaveBeenCalledWith({
      userId: 'user-1',
      diaryDate: '2026-05-18',
    });
    expect(patientCareRepository.createDailyConsumption).toHaveBeenCalledWith(
      expect.objectContaining({
        diaryId: 'diary-1',
        type: 'food',
        name: 'Nasi padang',
        portion: '1 plate nasi padang with rice and beef rendang',
        nutritionSource: 'qwen_ollama',
        energyKcal: 980,
      })
    );
    expect(invalidateDiaryCache).toHaveBeenCalledWith('user-1');
    expect(result.estimation.portion).toBe('1 plate nasi padang with rice and beef rendang');
    expect(result.consumption).toBeTruthy();
  });

  test('estimateNutrition normalizes percentage confidence from model output', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          message: {
            content: JSON.stringify({
              detectedFoods: ['nasi padang', 'beef rendang'],
              portion: '1 plate nasi padang',
              portionGrams: '650',
              nutritionSnapshot: {
                energyKcal: '980',
                proteinG: 35,
                carbohydrateG: 95,
                sugarG: 8,
                fiberG: 10,
                totalFatG: 52,
                saturatedFatG: 20,
                monounsaturatedFatG: null,
                polyunsaturatedFatG: null,
                cholesterolMg: 110,
                calciumMg: 160,
              },
              confidence: 90,
              assumptions: ['standard serving size'],
            }),
          },
        }),
    });

    const result = await nutritionEstimationService.estimateNutrition({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        mealName: 'Nasi padang',
        mealDescription: 'Nasi padang dengan rendang',
      },
    });

    expect(result.confidence).toBe(0.9);
    expect(result.portionGrams).toBe(650);
    expect(result.nutritionSnapshot.energyKcal).toBe(980);
  });
});
