jest.mock('../src/config/env', () => ({
  nutritionEstimation: {
    enabled: true,
    geminiApiKey: 'test-gemini-key',
    geminiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-3-flash-preview',
    models: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'],
    timeoutMs: 45000,
    maxOutputTokens: 1200,
    thinkingLevel: 'minimal',
    maxRequestsPerMinutePerModel: 4,
    maxRequestsPerDayPerModel: 19,
  },
}));

jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
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
const { resetGeminiQuotaStateForTests } = require('../src/services/patient-care/geminiQuotaService');
const nutritionEstimationService = require('../src/services/patient-care/nutritionEstimationService');

describe('nutrition estimation service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    resetGeminiQuotaStateForTests();
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetGeminiQuotaStateForTests();
  });

  test('estimateNutrition returns validated structured output from Gemini', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      is_food_image: true,
                      validation_message: '',
                      meal_category: 'Makanan Berat',
                      detected_foods: ['white rice', 'beef rendang'],
                      portion_estimate: '1 plate nasi padang with rice and beef rendang',
                      portion_grams_estimate: 650,
                      fdc_food_id: '',
                      nutrition_source: 'gemini_food_macro_analysis',
                      calories_kcal: 980,
                      protein_g: 35,
                      carbs_g: 95,
                      sugar_g: 8,
                      fiber_g: 10,
                      fat_g: 52,
                      saturated_fat_g: 20,
                      monounsaturated_fat_g: 18,
                      polyunsaturated_fat_g: 6,
                      cholesterol_mg: 110,
                      calcium_mg: 160,
                      confidence: 'high',
                      notes: 'standard nasi padang serving size',
                    }),
                  },
                ],
              },
            },
          ],
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
      meal_category: 'Makanan Berat',
      nutrition_source: 'gemini_food_macro_analysis',
      portion_estimate: '1 plate nasi padang with rice and beef rendang',
      detected_foods: ['white rice', 'beef rendang'],
      calories_kcal: 980,
      confidence: 'high',
    });
  });

  test('estimateNutritionAndSaveConsumptionByDate saves estimated nutrition snapshot', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      is_food_image: true,
                      validation_message: '',
                      meal_category: 'Makanan Berat',
                      detected_foods: ['white rice', 'beef rendang'],
                      portion_estimate: '1 plate nasi padang with rice and beef rendang',
                      portion_grams_estimate: 650,
                      fdc_food_id: '',
                      nutrition_source: 'gemini_food_macro_analysis',
                      calories_kcal: 980,
                      protein_g: 35,
                      carbs_g: 95,
                      sugar_g: 8,
                      fiber_g: 10,
                      fat_g: 52,
                      saturated_fat_g: 20,
                      monounsaturated_fat_g: 18,
                      polyunsaturated_fat_g: 6,
                      cholesterol_mg: 110,
                      calcium_mg: 160,
                      confidence: 'high',
                      notes: 'standard nasi padang serving size',
                    }),
                  },
                ],
              },
            },
          ],
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
      nutritionSource: 'gemini_food_macro_analysis',
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
        nutritionSource: 'gemini_food_macro_analysis',
        energyKcal: 980,
      })
    );
    expect(invalidateDiaryCache).toHaveBeenCalledWith('user-1');
    expect(result.estimation.portion_estimate).toBe('1 plate nasi padang with rice and beef rendang');
    expect(result.consumption).toBeTruthy();
  });

  test('estimateNutrition sends image payload to Gemini when imageBase64 exists', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      is_food_image: true,
                      validation_message: '',
                      meal_category: 'Makanan Berat',
                      detected_foods: ['nasi padang'],
                      portion_estimate: '1 plate nasi padang',
                      portion_grams_estimate: 650,
                      fdc_food_id: '',
                      nutrition_source: 'gemini_food_macro_analysis',
                      calories_kcal: 980,
                      protein_g: 35,
                      carbs_g: 95,
                      sugar_g: 8,
                      fiber_g: 10,
                      fat_g: 52,
                      saturated_fat_g: 20,
                      monounsaturated_fat_g: 18,
                      polyunsaturated_fat_g: 6,
                      cholesterol_mg: 110,
                      calcium_mg: 160,
                      confidence: 'medium',
                      notes: 'image-informed estimate',
                    }),
                  },
                ],
              },
            },
          ],
        }),
    });

    await nutritionEstimationService.estimateNutrition({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        mealName: 'Nasi padang',
        mealDescription: 'Nasi padang dengan rendang',
        imageBase64: 'ZmFrZUJhc2U2NA==',
        imageMimeType: 'image/jpeg',
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/models\/(gemini-3\.5-flash|gemini-3-flash-preview|gemini-2\.5-flash):generateContent\?key=test-gemini-key/
      ),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  test('estimateNutritionAndSaveConsumptionByDate falls back to Gemini meal_category when payload.type is absent', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      is_food_image: true,
                      validation_message: '',
                      meal_category: 'Makanan Berat',
                      detected_foods: ['soto lamongan'],
                      portion_estimate: '1 bowl soto lamongan with rice',
                      portion_grams_estimate: 650,
                      fdc_food_id: '',
                      nutrition_source: 'gemini_food_macro_analysis',
                      calories_kcal: 610,
                      protein_g: 24,
                      carbs_g: 95,
                      sugar_g: 4,
                      fiber_g: 3,
                      fat_g: 15,
                      saturated_fat_g: 4,
                      monounsaturated_fat_g: 5,
                      polyunsaturated_fat_g: 4,
                      cholesterol_mg: 190,
                      calcium_mg: 85,
                      confidence: 'high',
                      notes: 'main evening meal',
                    }),
                  },
                ],
              },
            },
          ],
        }),
    });
    ensureHeartDiaryByDate.mockResolvedValueOnce({ diary_id: 'diary-1' });
    patientCareRepository.createDailyConsumption.mockResolvedValueOnce({
      consumptionId: 'cons-2',
      diaryId: 'diary-1',
      type: 'Makanan Berat',
      name: 'Soto Lamongan',
      portion: '1 bowl soto lamongan with rice',
      portionGrams: 650,
      fdcFoodId: null,
      nutritionSource: 'gemini_food_macro_analysis',
      energyKcal: 610,
      proteinG: 24,
      carbohydrateG: 95,
      sugarG: 4,
      fiberG: 3,
      totalFatG: 15,
      saturatedFatG: 4,
      monounsaturatedFatG: 5,
      polyunsaturatedFatG: 4,
      cholesterolMg: 190,
      calciumMg: 85,
      note: 'Kategori makan: Makanan Berat',
      timeStamp: new Date('2026-05-18T19:30:00.000Z'),
    });

    await nutritionEstimationService.estimateNutritionAndSaveConsumptionByDate({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        diaryDate: '2026-05-18',
        mealName: 'Soto Lamongan',
        mealDescription: 'Soto Lamongan with rice',
        time: '19:30',
      },
    });

    expect(patientCareRepository.createDailyConsumption).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Makanan Berat',
      })
    );
  });

  test('estimateNutrition falls back to the next configured Gemini model after a 429', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () =>
          JSON.stringify({
            error: {
              message: 'rate limit',
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        is_food_image: true,
                        validation_message: '',
                        meal_category: 'Makanan Berat',
                        detected_foods: ['nasi padang'],
                        portion_estimate: '1 piring nasi padang',
                        portion_grams_estimate: 650,
                        fdc_food_id: '',
                        nutrition_source: 'gemini_food_macro_analysis',
                        calories_kcal: 980,
                        protein_g: 35,
                        carbs_g: 95,
                        sugar_g: 8,
                        fiber_g: 10,
                        fat_g: 52,
                        saturated_fat_g: 20,
                        monounsaturated_fat_g: 18,
                        polyunsaturated_fat_g: 6,
                        cholesterol_mg: 110,
                        calcium_mg: 160,
                        confidence: 'high',
                        notes: 'Estimasi porsi restoran Indonesia.',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      });

    const result = await nutritionEstimationService.estimateNutrition({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        mealName: 'Nasi Padang',
        mealDescription: 'Rendang, telur, sayur',
      },
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/models/gemini-3.5-flash:generateContent?key=test-gemini-key'),
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/models/gemini-3-flash-preview:generateContent?key=test-gemini-key'),
      expect.any(Object)
    );
    expect(result.portion_estimate).toBe('1 piring nasi padang');
    expect(result.notes).toBe('Estimasi porsi restoran Indonesia.');
  });
});
