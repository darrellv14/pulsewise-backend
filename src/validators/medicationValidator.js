const { z } = require('zod');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');
const timeStringSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam harus HH:mm (24 jam)');

const optionalNullableString = (maxLength) =>
  z.union([z.string().trim().max(maxLength), z.literal(''), z.null()]).optional();

function hasUniqueReminderTimes(reminders) {
  const normalized = reminders.map((item) => item.scheduleTime);
  return new Set(normalized).size === normalized.length;
}

const userIdParamSchema = z.object({
  userId: uuidV4Schema,
});

const medicationParamsSchema = z.object({
  userId: uuidV4Schema,
  medicationId: uuidV4Schema,
});

const reminderParamsSchema = z.object({
  userId: uuidV4Schema,
  reminderId: uuidV4Schema,
});

const reminderInputSchema = z.object({
  scheduleTime: timeStringSchema,
});

const medicationDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const medicationCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: optionalNullableString(2000),
    conditionTag: optionalNullableString(64),
    reminders: z.array(reminderInputSchema).max(24).optional(),
  })
  .refine((value) => !value.reminders || hasUniqueReminderTimes(value.reminders), {
    message: 'Waktu reminder tidak boleh duplikat dalam satu request',
    path: ['reminders'],
  });

const medicationUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: optionalNullableString(2000),
    conditionTag: optionalNullableString(64),
    reminders: z.array(reminderInputSchema).max(24).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.conditionTag !== undefined ||
      value.reminders !== undefined,
    {
      message: 'Minimal satu field harus diisi untuk update',
    }
  )
  .refine((value) => !value.reminders || hasUniqueReminderTimes(value.reminders), {
    message: 'Waktu reminder tidak boleh duplikat dalam satu request',
    path: ['reminders'],
  });

const reminderCreateSchema = reminderInputSchema;
const reminderUpdateSchema = reminderInputSchema;

const medicationLogCreateSchema = z.object({
  medicationDate: medicationDateSchema,
  medicationTime: timeStringSchema.optional(),
});

const medicationListQuerySchema = paginationQuerySchema;
const reminderListQuerySchema = paginationQuerySchema;

const medicationLogQuerySchema = paginationQuerySchema
  .extend({
    startDate: medicationDateSchema.optional(),
    endDate: medicationDateSchema.optional(),
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

module.exports = {
  userIdParamSchema,
  medicationParamsSchema,
  reminderParamsSchema,
  medicationListQuerySchema,
  reminderListQuerySchema,
  medicationCreateSchema,
  medicationUpdateSchema,
  reminderCreateSchema,
  reminderUpdateSchema,
  medicationLogCreateSchema,
  medicationLogQuerySchema,
};
