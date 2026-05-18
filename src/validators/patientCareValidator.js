const { z } = require('zod');
const env = require('../config/env');
const {
  SYMPTOM_CODES,
  BODY_AREAS,
  PAIN_FREQUENCY_CODES,
  PAIN_LOCATION_CODES,
} = require('../constants/patientCareEnums');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');
const dateTimeSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Datetime tidak valid');
const timeOnlySchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format waktu harus HH:mm');

const optionalNullableString = (maxLength) =>
  z.union([z.string().trim().max(maxLength), z.literal(''), z.null()]).optional();
const allowedAvatarFormats = String(env.cloudinary.avatarAllowedFormats || 'jpg,jpeg,png,webp')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const userIdParamSchema = z.object({
  userId: uuidV4Schema,
});

const emergencyContactParamsSchema = z.object({
  userId: uuidV4Schema,
  emergencyContactId: uuidV4Schema,
});

const emergencyContactCreateSchema = z.object({
  contactLabel: z.string().trim().min(1).max(100),
  contactNumber: z.string().trim().min(3).max(50),
  isPriority: z.boolean().optional().default(false),
});

const emergencyContactUpdateSchema = z
  .object({
    contactLabel: optionalNullableString(100),
    contactNumber: optionalNullableString(50),
    isPriority: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.contactLabel !== undefined ||
      value.contactNumber !== undefined ||
      value.isPriority !== undefined,
    {
      message: 'Minimal satu field harus diisi',
    }
  );

const diaryParamsSchema = z.object({
  userId: uuidV4Schema,
  diaryId: uuidV4Schema,
});

const heartDiaryCreateSchema = z.object({
  diaryDate: dateSchema,
});

const heartDiaryByDateQuerySchema = z.object({
  date: dateSchema,
});

const emergencyContactListQuerySchema = paginationQuerySchema;

const heartDiaryQuerySchema = paginationQuerySchema
  .extend({
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
  })
  .refine(
    (value) => {
      if (!value.startDate || !value.endDate) {
        return true;
      }

      return new Date(value.endDate).getTime() >= new Date(value.startDate).getTime();
    },
    {
      message: 'endDate tidak boleh lebih kecil dari startDate',
      path: ['endDate'],
    }
  );

const bodyMetricCreateBaseSchema = z.object({
  conditionTag: optionalNullableString(64),
  bodyHeight: z.coerce.number().min(30).max(300).nullable().optional(),
  bodyWeight: z.coerce.number().min(1).max(500).nullable().optional(),
  bmi: z.coerce.number().min(1).max(100).nullable().optional(),
  systolicPressure: z.coerce.number().int().min(50).max(300).nullable().optional(),
  diastolicPressure: z.coerce.number().int().min(30).max(250).nullable().optional(),
  heartRate: z.coerce.number().int().min(20).max(250).nullable().optional(),
  timeStamp: dateTimeSchema.optional(),
});

const bodyMetricCreateSchema = bodyMetricCreateBaseSchema.refine(
  (value) =>
    value.bodyHeight !== undefined ||
    value.bodyWeight !== undefined ||
    value.bmi !== undefined ||
    value.systolicPressure !== undefined ||
    value.diastolicPressure !== undefined ||
    value.heartRate !== undefined ||
    value.conditionTag !== undefined,
  {
    message: 'Minimal satu metrik harus diisi',
  }
);

const bodyMetricCreateByDateSchema = bodyMetricCreateBaseSchema
  .extend({
    diaryDate: dateSchema,
  })
  .refine(
    (value) =>
      value.bodyHeight !== undefined ||
      value.bodyWeight !== undefined ||
      value.bmi !== undefined ||
      value.systolicPressure !== undefined ||
      value.diastolicPressure !== undefined ||
      value.heartRate !== undefined ||
      value.conditionTag !== undefined,
    {
      message: 'Minimal satu metrik harus diisi',
    }
  );

const activityCategorySchema = z.enum(['work', 'transport', 'recreation', 'other']).optional();
const intensityLevelSchema = z.enum(['light', 'moderate', 'vigorous', 'unknown']).optional();
const transportModeSchema = z.enum(['walk', 'bicycle', 'other']).optional();
const nullableSymptomCodeSchema = z.enum(SYMPTOM_CODES).nullable().optional();
const nullableBodyAreaSchema = z.enum(BODY_AREAS).nullable().optional();
const nullablePainFrequencyCodeSchema = z
  .union([
    z.literal(PAIN_FREQUENCY_CODES.UNKNOWN),
    z.literal(PAIN_FREQUENCY_CODES.LESS_THAN_30_MINUTES),
    z.literal(PAIN_FREQUENCY_CODES.THIRTY_MINUTES_OR_MORE),
  ])
  .nullable()
  .optional();
const nullablePainLocationCodeSchema = z
  .union([
    z.literal(PAIN_LOCATION_CODES.UNKNOWN),
    z.literal(PAIN_LOCATION_CODES.RIGHT_ARM),
    z.literal(PAIN_LOCATION_CODES.RIGHT_CHEST),
    z.literal(PAIN_LOCATION_CODES.NECK),
    z.literal(PAIN_LOCATION_CODES.UPPER_STERNUM),
    z.literal(PAIN_LOCATION_CODES.LOWER_STERNUM),
    z.literal(PAIN_LOCATION_CODES.LEFT_CHEST),
    z.literal(PAIN_LOCATION_CODES.LEFT_ARM),
    z.literal(PAIN_LOCATION_CODES.UPPER_ABDOMEN),
  ])
  .nullable()
  .optional();

const symptomCreateBaseExtension = {
  symptomCode: nullableSymptomCodeSchema,
  bodyArea: nullableBodyAreaSchema,
  isChestPain: z.boolean().nullable().optional(),
  painFrequencyCode: nullablePainFrequencyCodeSchema,
  painLocationCode: nullablePainLocationCodeSchema,
};

const activityCreateBaseExtension = {
  activityCategory: activityCategorySchema,
  intensityLevel: intensityLevelSchema,
  transportMode: transportModeSchema,
  outdoorMinutes: z.coerce.number().int().min(0).max(1440).nullable().optional(),
};

const symptomCreateSchema = z.object({
  symptomName: z.string().trim().min(1).max(120),
  ...symptomCreateBaseExtension,
  intensity: z.coerce.number().int().min(1).max(10).nullable().optional(),
  note: optionalNullableString(2000),
  timeStamp: dateTimeSchema.optional(),
})
  .superRefine((value, ctx) => {
    const isChestPainSymptom =
      value.isChestPain === true || value.symptomCode === 'chest_pain';

    if (!isChestPainSymptom) {
      return;
    }

    if (value.symptomCode !== 'chest_pain') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['symptomCode'],
        message: 'symptomCode harus chest_pain jika gejala ditandai sebagai nyeri dada',
      });
    }

    if (value.isChestPain !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['isChestPain'],
        message: 'isChestPain wajib true jika symptomCode adalah chest_pain',
      });
    }

    if (value.bodyArea !== 'chest') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bodyArea'],
        message: 'bodyArea wajib chest jika gejala ditandai sebagai nyeri dada',
      });
    }

    if (value.painFrequencyCode === undefined || value.painFrequencyCode === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['painFrequencyCode'],
        message: 'painFrequencyCode wajib diisi untuk gejala nyeri dada',
      });
    }

    if (value.painLocationCode === undefined || value.painLocationCode === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['painLocationCode'],
        message: 'painLocationCode wajib diisi untuk gejala nyeri dada',
      });
    }
  });

const symptomCreateByDateSchema = symptomCreateSchema.extend({
  diaryDate: dateSchema,
  time: timeOnlySchema.optional(),
});

const activityCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ...activityCreateBaseExtension,
  duration: z.coerce.number().int().min(1).max(1440).nullable().optional(),
  heartRate: z.coerce.number().int().min(20).max(250).nullable().optional(),
  userFeeling: optionalNullableString(80),
  note: optionalNullableString(2000),
  timeStamp: dateTimeSchema.optional(),
});

const activityCreateByDateSchema = activityCreateSchema.extend({
  diaryDate: dateSchema,
});

const consumptionCreateSchema = z.object({
  type: optionalNullableString(50),
  name: optionalNullableString(120),
  portion: optionalNullableString(255),
  portionGrams: z.coerce.number().min(0).max(100000).nullable().optional(),
  fdcFoodId: optionalNullableString(64),
  nutritionSource: optionalNullableString(32),
  energyKcal: z.coerce.number().min(0).max(100000).nullable().optional(),
  proteinG: z.coerce.number().min(0).max(100000).nullable().optional(),
  carbohydrateG: z.coerce.number().min(0).max(100000).nullable().optional(),
  sugarG: z.coerce.number().min(0).max(100000).nullable().optional(),
  fiberG: z.coerce.number().min(0).max(100000).nullable().optional(),
  totalFatG: z.coerce.number().min(0).max(100000).nullable().optional(),
  saturatedFatG: z.coerce.number().min(0).max(100000).nullable().optional(),
  monounsaturatedFatG: z.coerce.number().min(0).max(100000).nullable().optional(),
  polyunsaturatedFatG: z.coerce.number().min(0).max(100000).nullable().optional(),
  cholesterolMg: z.coerce.number().min(0).max(100000).nullable().optional(),
  calciumMg: z.coerce.number().min(0).max(100000).nullable().optional(),
  note: optionalNullableString(2000),
  timeStamp: dateTimeSchema.optional(),
});

const consumptionCreateByDateSchema = consumptionCreateSchema.extend({
  diaryDate: dateSchema,
  time: timeOnlySchema.optional(),
});

const nutritionEstimateSchema = z
  .object({
    mealName: z.string().trim().min(1).max(120),
    mealDescription: optionalNullableString(2000),
    imageBase64: optionalNullableString(15_000_000),
    imageMimeType: optionalNullableString(120),
  })
  .superRefine((value, ctx) => {
    if (!value.mealDescription && !value.imageBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mealDescription'],
        message: 'Minimal salah satu dari mealDescription atau imageBase64 wajib diisi',
      });
    }
  });

const nutritionEstimateAndSaveSchema = nutritionEstimateSchema.extend({
  diaryDate: dateSchema,
  type: optionalNullableString(50),
  name: optionalNullableString(120),
  time: timeOnlySchema.optional(),
  timeStamp: dateTimeSchema.optional(),
});

const sleepDiaryQuerySchema = z.object({
  date: dateSchema,
});

const sleepRecordUpsertSchema = z.object({
  diaryDate: dateSchema,
  sleepTime: timeOnlySchema.optional(),
  wakeTime: timeOnlySchema.optional(),
  sleepDurationHours: z.coerce.number().min(0).max(24).nullable().optional(),
  source: optionalNullableString(64),
});

const avatarSignatureQuerySchema = z.object({
  folder: optionalNullableString(120),
});

const avatarSaveSchema = z.object({
  secureUrl: z.string().trim().url().max(2000),
  publicId: optionalNullableString(300),
  bytes: z.coerce.number().int().min(1).max(env.cloudinary.avatarMaxBytes).optional(),
  width: z.coerce.number().int().min(1).max(env.cloudinary.avatarMaxWidth).optional(),
  height: z.coerce.number().int().min(1).max(env.cloudinary.avatarMaxHeight).optional(),
  format: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => allowedAvatarFormats.includes(value), {
      message: `Format avatar harus salah satu dari ${allowedAvatarFormats.join(', ')}`,
    })
    .optional(),
  resourceType: z.literal('image').optional(),
});

module.exports = {
  userIdParamSchema,
  emergencyContactParamsSchema,
  emergencyContactCreateSchema,
  emergencyContactUpdateSchema,
  diaryParamsSchema,
  heartDiaryCreateSchema,
  heartDiaryByDateQuerySchema,
  heartDiaryQuerySchema,
  bodyMetricCreateSchema,
  bodyMetricCreateByDateSchema,
  symptomCreateSchema,
  symptomCreateByDateSchema,
  activityCreateSchema,
  activityCreateByDateSchema,
  consumptionCreateSchema,
  consumptionCreateByDateSchema,
  nutritionEstimateSchema,
  nutritionEstimateAndSaveSchema,
  sleepDiaryQuerySchema,
  sleepRecordUpsertSchema,
  emergencyContactListQuerySchema,
  avatarSignatureQuerySchema,
  avatarSaveSchema,
};
