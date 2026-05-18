const { z } = require('zod');
const env = require('../../config/env');
const { BAD_GATEWAY, GATEWAY_TIMEOUT, SERVICE_UNAVAILABLE } = require('../../constants/httpStatus');
const { createHttpError } = require('../../utils/httpError');
const patientCareRepository = require('../../repositories/patientCareRepository');
const { assertUserScope, normalizeNullableText, resolveDiaryEntryTimestamp } = require('./shared');
const { ensureHeartDiaryByDate } = require('./diaryService');
const { invalidateDiaryCache } = require('./cache');
const { mapConsumption } = require('./mappers');

function coerceNullableNumber(max) {
  return z.preprocess((value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'string') {
      const normalized = Number(value.trim());
      return Number.isFinite(normalized) ? normalized : value;
    }

    return value;
  }, z.number().min(0).max(max).nullable().default(null));
}

function coerceConfidence() {
  return z.preprocess((value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    let normalized = value;
    if (typeof normalized === 'string') {
      const parsed = Number(normalized.trim());
      normalized = Number.isFinite(parsed) ? parsed : normalized;
    }

    if (typeof normalized === 'number' && Number.isFinite(normalized) && normalized > 1) {
      if (normalized <= 100) {
        return normalized / 100;
      }
    }

    return normalized;
  }, z.number().min(0).max(1).nullable().default(null));
}

const nutritionEstimateResultSchema = z.object({
  detectedFoods: z.array(z.string().trim().min(1)).default([]),
  portion: z.string().trim().min(1).max(255),
  portionGrams: coerceNullableNumber(100000),
  nutritionSnapshot: z.object({
    energyKcal: coerceNullableNumber(100000),
    proteinG: coerceNullableNumber(100000),
    carbohydrateG: coerceNullableNumber(100000),
    sugarG: coerceNullableNumber(100000),
    fiberG: coerceNullableNumber(100000),
    totalFatG: coerceNullableNumber(100000),
    saturatedFatG: coerceNullableNumber(100000),
    monounsaturatedFatG: coerceNullableNumber(100000),
    polyunsaturatedFatG: coerceNullableNumber(100000),
    cholesterolMg: coerceNullableNumber(100000),
    calciumMg: coerceNullableNumber(100000),
  }),
  confidence: coerceConfidence(),
  assumptions: z.array(z.string().trim().min(1)).default([]),
});

function buildNutritionJsonSchema() {
  return {
    type: 'object',
    properties: {
      detectedFoods: {
        type: 'array',
        items: { type: 'string' },
      },
      portion: { type: 'string' },
      portionGrams: { type: ['number', 'null'] },
      nutritionSnapshot: {
        type: 'object',
        properties: {
          energyKcal: { type: ['number', 'null'] },
          proteinG: { type: ['number', 'null'] },
          carbohydrateG: { type: ['number', 'null'] },
          sugarG: { type: ['number', 'null'] },
          fiberG: { type: ['number', 'null'] },
          totalFatG: { type: ['number', 'null'] },
          saturatedFatG: { type: ['number', 'null'] },
          monounsaturatedFatG: { type: ['number', 'null'] },
          polyunsaturatedFatG: { type: ['number', 'null'] },
          cholesterolMg: { type: ['number', 'null'] },
          calciumMg: { type: ['number', 'null'] },
        },
        required: [
          'energyKcal',
          'proteinG',
          'carbohydrateG',
          'sugarG',
          'fiberG',
          'totalFatG',
          'saturatedFatG',
          'monounsaturatedFatG',
          'polyunsaturatedFatG',
          'cholesterolMg',
          'calciumMg',
        ],
      },
      confidence: { type: ['number', 'null'] },
      assumptions: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: [
      'detectedFoods',
      'portion',
      'portionGrams',
      'nutritionSnapshot',
      'confidence',
      'assumptions',
    ],
  };
}

function buildSystemPrompt() {
  return [
    'You are a nutrition estimation assistant focused especially on foods commonly eaten in Indonesia from Sabang to Merauke, but you must also handle non-Indonesian foods.',
    'You receive a meal name, optional meal description, and optional image.',
    'Estimate conservatively when the meal is ambiguous.',
    'Return JSON only.',
    'Do not include markdown fences or extra prose.',
    'The field "portion" must be concise and never exceed 255 characters.',
    'All nutrition values must be numeric or null and must never be negative.',
    'Confidence must be a decimal between 0 and 1.',
  ].join(' ');
}

function buildUserPrompt({ mealName, mealDescription, locale }) {
  return [
    `Locale: ${locale || 'id-ID'}`,
    `Meal name: ${mealName}`,
    `Meal description: ${mealDescription || '(not provided)'}`,
    'Estimate realistic Indonesian serving assumptions when relevant.',
    'Return JSON that matches the provided schema exactly.',
  ].join('\n');
}

function stripDataUrlPrefix(imageBase64) {
  if (!imageBase64) {
    return null;
  }

  return String(imageBase64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
}

function ensureNutritionEnabled() {
  if (!env.nutritionEstimation.enabled) {
    throw createHttpError(
      'Nutrition estimation belum diaktifkan pada environment ini',
      SERVICE_UNAVAILABLE
    );
  }
}

async function callOllamaNutritionModel({ mealName, mealDescription, imageBase64, locale }) {
  ensureNutritionEnabled();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.nutritionEstimation.timeoutMs);

  const userMessage = {
    role: 'user',
    content: buildUserPrompt({ mealName, mealDescription, locale }),
  };
  const normalizedImage = stripDataUrlPrefix(imageBase64);
  if (normalizedImage) {
    userMessage.images = [normalizedImage];
  }

  try {
    const response = await fetch(`${env.nutritionEstimation.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.nutritionEstimation.model,
        stream: false,
        keep_alive: env.nutritionEstimation.keepAlive,
        format: buildNutritionJsonSchema(),
        options: {
          temperature: env.nutritionEstimation.temperature,
        },
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
          userMessage,
        ],
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw createHttpError('Ollama nutrition estimation gagal', BAD_GATEWAY, {
        status: response.status,
        body: responseText,
      });
    }

    let parsedTransport;
    try {
      parsedTransport = JSON.parse(responseText);
    } catch (_error) {
      throw createHttpError('Respons Ollama tidak valid JSON', BAD_GATEWAY);
    }

    const content = parsedTransport?.message?.content;
    if (!content) {
      throw createHttpError('Respons Ollama tidak memiliki content', BAD_GATEWAY);
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (_error) {
      throw createHttpError('Output model bukan JSON valid', BAD_GATEWAY);
    }

    const estimate = nutritionEstimateResultSchema.parse(parsedContent);

    return {
      ...estimate,
      nutritionSource: 'qwen_ollama',
      model: env.nutritionEstimation.model,
      usage: {
        totalDuration: parsedTransport.total_duration || null,
        loadDuration: parsedTransport.load_duration || null,
        promptEvalCount: parsedTransport.prompt_eval_count || null,
        evalCount: parsedTransport.eval_count || null,
      },
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createHttpError('Permintaan ke Ollama timeout', GATEWAY_TIMEOUT);
    }

    if (error.statusCode) {
      throw error;
    }

    throw createHttpError('Gagal memanggil model nutrition estimation', BAD_GATEWAY);
  } finally {
    clearTimeout(timeout);
  }
}

async function estimateNutrition({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  return callOllamaNutritionModel({
    mealName: payload.mealName,
    mealDescription: payload.mealDescription,
    imageBase64: payload.imageBase64,
    locale: payload.locale,
  });
}

function buildNutritionNote({ estimate }) {
  const noteParts = [];

  if (estimate.detectedFoods?.length) {
    noteParts.push(`Detected foods: ${estimate.detectedFoods.join(', ')}`);
  }

  if (estimate.assumptions?.length) {
    noteParts.push(`Assumptions: ${estimate.assumptions.join('; ')}`);
  }

  if (estimate.confidence !== null && estimate.confidence !== undefined) {
    noteParts.push(`Confidence: ${estimate.confidence}`);
  }

  noteParts.push(`Model: ${estimate.model}`);

  return noteParts.join(' | ').slice(0, 2000);
}

async function estimateNutritionAndSaveConsumptionByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const estimate = await callOllamaNutritionModel({
    mealName: payload.mealName,
    mealDescription: payload.mealDescription,
    imageBase64: payload.imageBase64,
    locale: payload.locale,
  });

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const created = await patientCareRepository.createDailyConsumption({
    diaryId: diary.diary_id,
    type: normalizeNullableText(payload.type) || 'food',
    name: normalizeNullableText(payload.name) || normalizeNullableText(payload.mealName),
    portion: estimate.portion,
    portionGrams: estimate.portionGrams,
    fdcFoodId: null,
    nutritionSource: estimate.nutritionSource,
    energyKcal: estimate.nutritionSnapshot.energyKcal,
    proteinG: estimate.nutritionSnapshot.proteinG,
    carbohydrateG: estimate.nutritionSnapshot.carbohydrateG,
    sugarG: estimate.nutritionSnapshot.sugarG,
    fiberG: estimate.nutritionSnapshot.fiberG,
    totalFatG: estimate.nutritionSnapshot.totalFatG,
    saturatedFatG: estimate.nutritionSnapshot.saturatedFatG,
    monounsaturatedFatG: estimate.nutritionSnapshot.monounsaturatedFatG,
    polyunsaturatedFatG: estimate.nutritionSnapshot.polyunsaturatedFatG,
    cholesterolMg: estimate.nutritionSnapshot.cholesterolMg,
    calciumMg: estimate.nutritionSnapshot.calciumMg,
    note: buildNutritionNote({ estimate }),
    timeStamp: resolveDiaryEntryTimestamp({
      diaryDate: payload.diaryDate,
      time: payload.time,
      timeStamp: payload.timeStamp,
    }),
  });

  await invalidateDiaryCache(userId);

  return {
    consumption: mapConsumption(created),
    estimation: estimate,
  };
}

module.exports = {
  estimateNutrition,
  estimateNutritionAndSaveConsumptionByDate,
};
