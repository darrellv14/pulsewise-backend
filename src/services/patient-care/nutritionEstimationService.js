const { z } = require('zod');
const env = require('../../config/env');
const {
  BAD_GATEWAY,
  BAD_REQUEST,
  GATEWAY_TIMEOUT,
  SERVICE_UNAVAILABLE,
} = require('../../constants/httpStatus');
const { createHttpError } = require('../../utils/httpError');
const patientCareRepository = require('../../repositories/patientCareRepository');
const { assertUserScope, normalizeNullableText, resolveDiaryEntryTimestamp } = require('./shared');
const { ensureHeartDiaryByDate } = require('./diaryService');
const { invalidateDiaryCache } = require('./cache');
const { mapConsumption } = require('./mappers');

const DEFAULT_IMAGE_MIME_TYPE = 'image/jpeg';
const MAX_PORTION_ESTIMATE_LENGTH = 255;
const DEFAULT_NUTRITION_SOURCE = 'gemini_food_macro_analysis';

function coerceNumber(max) {
  return z.preprocess((value) => {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    if (typeof value === 'string') {
      const normalized = Number(value.trim());
      return Number.isFinite(normalized) ? normalized : value;
    }

    return value;
  }, z.number().min(0).max(max));
}

const foodMacroAnalysisSchema = z
  .object({
    is_food_image: z.boolean(),
    validation_message: z.string(),
    detected_foods: z.array(z.string().trim().min(1)).default([]),
    portion_estimate: z.string().trim().max(MAX_PORTION_ESTIMATE_LENGTH),
    portion_grams_estimate: coerceNumber(100000),
    fdc_food_id: z.string().trim(),
    nutrition_source: z.literal(DEFAULT_NUTRITION_SOURCE),
    calories_kcal: coerceNumber(100000),
    protein_g: coerceNumber(100000),
    carbs_g: coerceNumber(100000),
    sugar_g: coerceNumber(100000),
    fiber_g: coerceNumber(100000),
    fat_g: coerceNumber(100000),
    saturated_fat_g: coerceNumber(100000),
    monounsaturated_fat_g: coerceNumber(100000),
    polyunsaturated_fat_g: coerceNumber(100000),
    cholesterol_mg: coerceNumber(100000),
    calcium_mg: coerceNumber(100000),
    confidence: z.enum(['low', 'medium', 'high']),
    notes: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.sugar_g > value.carbs_g) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sugar_g'],
        message: 'sugar_g tidak boleh lebih besar dari carbs_g',
      });
    }

    if (
      value.saturated_fat_g + value.monounsaturated_fat_g + value.polyunsaturated_fat_g >
      value.fat_g
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fat_g'],
        message: 'Komponen lemak tidak boleh melebihi fat_g',
      });
    }
  });

function buildResponseJsonSchema() {
  return {
    type: 'object',
    properties: {
      is_food_image: { type: 'boolean' },
      validation_message: { type: 'string' },
      detected_foods: {
        type: 'array',
        items: { type: 'string' },
      },
      portion_estimate: {
        type: 'string',
      },
      portion_grams_estimate: {
        type: 'number',
      },
      fdc_food_id: {
        type: 'string',
      },
      nutrition_source: {
        type: 'string',
        enum: [DEFAULT_NUTRITION_SOURCE],
      },
      calories_kcal: { type: 'number' },
      protein_g: { type: 'number' },
      carbs_g: { type: 'number' },
      sugar_g: { type: 'number' },
      fiber_g: { type: 'number' },
      fat_g: { type: 'number' },
      saturated_fat_g: { type: 'number' },
      monounsaturated_fat_g: { type: 'number' },
      polyunsaturated_fat_g: { type: 'number' },
      cholesterol_mg: { type: 'number' },
      calcium_mg: { type: 'number' },
      confidence: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
      },
      notes: { type: 'string' },
    },
    required: [
      'is_food_image',
      'validation_message',
      'detected_foods',
      'portion_estimate',
      'portion_grams_estimate',
      'fdc_food_id',
      'nutrition_source',
      'calories_kcal',
      'protein_g',
      'carbs_g',
      'sugar_g',
      'fiber_g',
      'fat_g',
      'saturated_fat_g',
      'monounsaturated_fat_g',
      'polyunsaturated_fat_g',
      'cholesterol_mg',
      'calcium_mg',
      'confidence',
      'notes',
    ],
  };
}

function buildPrompt({ foodName, userDescription }) {
  const foodNameLine = foodName
    ? `User-provided food name hint: ${foodName}`
    : 'No food name hint was provided.';
  const descriptionLine = userDescription
    ? `User description: ${userDescription}`
    : 'No additional user description was provided.';

  return `
Analyze this food image and estimate the total macros for all visible food and drink items.

${foodNameLine}
${descriptionLine}

Return only JSON that matches the schema.

Rules:
- First decide whether the image primarily shows edible food or drink.
- If no image is provided, decide whether the food name and description clearly describe edible food or drink.
- If the input does not clearly show or describe food or drink, return:
  is_food_image = false
  validation_message = a short user-facing message explaining that the image does not look like food or drink and the user should retake the photo
  detected_foods = []
  portion_estimate = ""
  portion_grams_estimate = 0
  all nutrition numbers = 0
  fdc_food_id = ""
  confidence = "low"
  notes = "Non-food image."
- If the input does show or describe food or drink, return is_food_image = true and validation_message = "".
- Estimate total nutrition for the visible portion only.
- If multiple foods are visible, combine the totals.
- Use your best estimate for grams and nutrition even when portions are uncertain.
- Treat the user-provided food name and description as helpful hints, but still verify against the image when an image exists.
- Keep portion_estimate short, human-readable, and at most ${MAX_PORTION_ESTIMATE_LENGTH} characters.
- Return all gram-based nutrients in grams and cholesterol_mg/calcium_mg in milligrams.
- Keep sugar_g less than or equal to carbs_g when possible.
- Keep saturated_fat_g + monounsaturated_fat_g + polyunsaturated_fat_g less than or equal to fat_g when possible.
- If you cannot confidently map the food to a USDA FoodData Central item, return an empty string for fdc_food_id.
- Always return nutrition_source as ${DEFAULT_NUTRITION_SOURCE}.
- Use 0 only when a value is negligible or truly impossible to infer from the image and description.
- Keep detected_foods short and specific.
- Mention uncertainty honestly in notes.
- Do not give medical advice.
`.trim();
}

function stripDataUrlPrefix(imageBase64) {
  if (!imageBase64) {
    return null;
  }

  return String(imageBase64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
}

function normalizeImageMimeType(imageMimeType) {
  const normalized = normalizeNullableText(imageMimeType);
  return normalized || DEFAULT_IMAGE_MIME_TYPE;
}

function ensureNutritionEnabled() {
  if (!env.nutritionEstimation.enabled) {
    throw createHttpError(
      'Nutrition estimation belum diaktifkan pada environment ini',
      SERVICE_UNAVAILABLE
    );
  }

  if (!env.nutritionEstimation.geminiApiKey) {
    throw createHttpError('GEMINI_API_KEY belum diatur', SERVICE_UNAVAILABLE);
  }
}

function mapGeminiError({ status, body }) {
  let parsedBody = null;
  try {
    parsedBody = body ? JSON.parse(body) : null;
  } catch (_error) {
    parsedBody = null;
  }

  const providerMessage = parsedBody?.error?.message || null;

  if (status === 400) {
    return createHttpError(providerMessage || 'Request Gemini tidak valid', BAD_REQUEST, {
      status,
      body,
    });
  }

  if (status === 401 || status === 403) {
    return createHttpError(
      'GEMINI_API_KEY tidak valid atau tidak diizinkan untuk project ini',
      SERVICE_UNAVAILABLE,
      { status, body }
    );
  }

  if (status === 429) {
    return createHttpError('Kuota Gemini habis atau rate limit tercapai', SERVICE_UNAVAILABLE, {
      status,
      body,
    });
  }

  return createHttpError(providerMessage || 'Gemini nutrition estimation gagal', BAD_GATEWAY, {
    status,
    body,
  });
}

function extractCandidateText(parsedResponse) {
  const candidate = Array.isArray(parsedResponse?.candidates) ? parsedResponse.candidates[0] : null;
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const textParts = parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean);

  return textParts.join('\n').trim();
}

async function callGeminiNutritionModel({
  mealName,
  mealDescription,
  imageBase64,
  imageMimeType,
}) {
  ensureNutritionEnabled();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.nutritionEstimation.timeoutMs);
  const parts = [
    {
      text: buildPrompt({
        foodName: normalizeNullableText(mealName) || '',
        userDescription: normalizeNullableText(mealDescription) || '',
      }),
    },
  ];

  const normalizedImage = stripDataUrlPrefix(imageBase64);
  if (normalizedImage) {
    parts.push({
      inline_data: {
        mime_type: normalizeImageMimeType(imageMimeType),
        data: normalizedImage,
      },
    });
  }

  try {
    const url =
      `${env.nutritionEstimation.geminiBaseUrl}/models/` +
      `${env.nutritionEstimation.model}:generateContent?key=${env.nutritionEstimation.geminiApiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: buildResponseJsonSchema(),
          maxOutputTokens: env.nutritionEstimation.maxOutputTokens,
          thinkingConfig: {
            thinkingLevel: env.nutritionEstimation.thinkingLevel,
          },
        },
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw mapGeminiError({
        status: response.status,
        body: responseText,
      });
    }

    let parsedTransport;
    try {
      parsedTransport = JSON.parse(responseText);
    } catch (_error) {
      throw createHttpError('Respons Gemini tidak valid JSON', BAD_GATEWAY);
    }

    const outputText = extractCandidateText(parsedTransport);
    if (!outputText) {
      throw createHttpError('Respons Gemini tidak memiliki text output', BAD_GATEWAY, {
        body: responseText,
      });
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(outputText);
    } catch (_error) {
      throw createHttpError('Output Gemini bukan JSON valid', BAD_GATEWAY, {
        body: outputText,
      });
    }

    return foodMacroAnalysisSchema.parse(parsedContent);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createHttpError('Permintaan ke Gemini timeout', GATEWAY_TIMEOUT);
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

  return callGeminiNutritionModel({
    mealName: payload.mealName,
    mealDescription: payload.mealDescription,
    imageBase64: payload.imageBase64,
    imageMimeType: payload.imageMimeType,
  });
}

function buildNutritionNote({ estimate }) {
  const noteParts = [];

  if (estimate.detected_foods?.length) {
    noteParts.push(`Detected foods: ${estimate.detected_foods.join(', ')}`);
  }

  if (estimate.fdc_food_id) {
    noteParts.push(`FDC ID: ${estimate.fdc_food_id}`);
  }

  if (estimate.confidence) {
    noteParts.push(`Confidence: ${estimate.confidence}`);
  }

  if (estimate.notes) {
    noteParts.push(`Notes: ${estimate.notes}`);
  }

  return noteParts.join(' | ').slice(0, 2000);
}

function assertFoodEstimate(estimate) {
  if (estimate.is_food_image) {
    return;
  }

  throw createHttpError(
    estimate.validation_message || 'Input tidak terlihat seperti makanan atau minuman',
    BAD_REQUEST,
    estimate
  );
}

async function estimateNutritionAndSaveConsumptionByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const estimate = await callGeminiNutritionModel({
    mealName: payload.mealName,
    mealDescription: payload.mealDescription,
    imageBase64: payload.imageBase64,
    imageMimeType: payload.imageMimeType,
  });

  assertFoodEstimate(estimate);

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const created = await patientCareRepository.createDailyConsumption({
    diaryId: diary.diary_id,
    type: normalizeNullableText(payload.type) || 'food',
    name: normalizeNullableText(payload.name) || normalizeNullableText(payload.mealName),
    portion: estimate.portion_estimate,
    portionGrams:
      estimate.portion_grams_estimate > 0 ? estimate.portion_grams_estimate : null,
    fdcFoodId: normalizeNullableText(estimate.fdc_food_id),
    nutritionSource: estimate.nutrition_source,
    energyKcal: estimate.calories_kcal,
    proteinG: estimate.protein_g,
    carbohydrateG: estimate.carbs_g,
    sugarG: estimate.sugar_g,
    fiberG: estimate.fiber_g,
    totalFatG: estimate.fat_g,
    saturatedFatG: estimate.saturated_fat_g,
    monounsaturatedFatG: estimate.monounsaturated_fat_g,
    polyunsaturatedFatG: estimate.polyunsaturated_fat_g,
    cholesterolMg: estimate.cholesterol_mg,
    calciumMg: estimate.calcium_mg,
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
