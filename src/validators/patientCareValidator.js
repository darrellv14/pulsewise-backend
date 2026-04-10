const { z } = require('zod');
const env = require('../config/env');

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
});

const emergencyContactUpdateSchema = z
  .object({
    contactLabel: optionalNullableString(100),
    contactNumber: optionalNullableString(50),
  })
  .refine((value) => value.contactLabel !== undefined || value.contactNumber !== undefined, {
    message: 'Minimal satu field harus diisi',
  });

const diaryParamsSchema = z.object({
  userId: uuidV4Schema,
  diaryId: uuidV4Schema,
});

const heartDiaryCreateSchema = z.object({
  diaryDate: dateSchema,
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

const bodyMetricCreateSchema = z
  .object({
    conditionTag: optionalNullableString(64),
    bodyHeight: z.coerce.number().min(30).max(300).nullable().optional(),
    bodyWeight: z.coerce.number().min(1).max(500).nullable().optional(),
    bmi: z.coerce.number().min(1).max(100).nullable().optional(),
    systolicPressure: z.coerce.number().int().min(50).max(300).nullable().optional(),
    diastolicPressure: z.coerce.number().int().min(30).max(250).nullable().optional(),
    timeStamp: dateTimeSchema.optional(),
  })
  .refine(
    (value) =>
      value.bodyHeight !== undefined ||
      value.bodyWeight !== undefined ||
      value.bmi !== undefined ||
      value.systolicPressure !== undefined ||
      value.diastolicPressure !== undefined ||
      value.conditionTag !== undefined,
    {
      message: 'Minimal satu metrik harus diisi',
    }
  );

const symptomCreateSchema = z.object({
  symptomName: z.string().trim().min(1).max(120),
  intensity: z.coerce.number().int().min(1).max(10).nullable().optional(),
  note: optionalNullableString(2000),
  timeStamp: dateTimeSchema.optional(),
});

const activityCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  duration: z.coerce.number().int().min(1).max(1440).nullable().optional(),
  heartRate: z.coerce.number().int().min(20).max(250).nullable().optional(),
  userFeeling: optionalNullableString(80),
  note: optionalNullableString(2000),
  timeStamp: dateTimeSchema.optional(),
});

const consumptionCreateSchema = z.object({
  type: optionalNullableString(50),
  name: optionalNullableString(120),
  portion: optionalNullableString(80),
  note: optionalNullableString(2000),
  timeStamp: dateTimeSchema.optional(),
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
  heartDiaryQuerySchema,
  bodyMetricCreateSchema,
  symptomCreateSchema,
  activityCreateSchema,
  consumptionCreateSchema,
  emergencyContactListQuerySchema,
  avatarSignatureQuerySchema,
  avatarSaveSchema,
};
