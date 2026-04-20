const { z } = require('zod');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');
const timeStringSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam harus HH:mm (24 jam)');
const medicationFrequencySchema = z.enum(['daily', 'weekly']);
const medicationLogStatusSchema = z.enum(['taken', 'skipped', 'missed']);
const dayOfWeekSchema = z.coerce.number().int().min(1).max(7);
const medicationDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');
const maxCalendarRangeDays = 93;

const optionalNullableString = (maxLength) =>
  z.union([z.string().trim().max(maxLength), z.literal(''), z.null()]).optional();
const optionalNullableNumber = (min, max) =>
  z.coerce.number().min(min).max(max).nullable().optional();

function hasUniqueReminderSchedules(reminders) {
  const normalized = reminders.map((item) => `${item.dayOfWeek ?? 0}|${item.scheduleTime}`);
  return new Set(normalized).size === normalized.length;
}

function hasUniqueValues(values) {
  if (!values) {
    return true;
  }

  return new Set(values).size === values.length;
}

function isMedicationScheduleCombinationValid(value) {
  if (value.frequency === 'daily') {
    return value.numOfDays !== undefined && value.numOfDays !== null && !value.daysOfWeek;
  }

  if (value.frequency === 'weekly') {
    return !!value.daysOfWeek && value.daysOfWeek.length > 0 && value.numOfDays === undefined;
  }

  return true;
}

function hasValidMedicationUpdateCombination(value) {
  if (value.frequency === 'daily' && value.daysOfWeek !== undefined) {
    return false;
  }

  if (value.frequency === 'weekly' && value.numOfDays !== undefined) {
    return false;
  }

  return true;
}

function hasUniqueIntakeTimes(value) {
  return hasUniqueValues(value.intakeTimes);
}

function hasUniqueDaysOfWeek(value) {
  return hasUniqueValues(value.daysOfWeek);
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
  dayOfWeek: dayOfWeekSchema.nullable().optional(),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const intakeTimesSchema = z.array(timeStringSchema).min(1).max(24);
const daysOfWeekSchema = z.array(dayOfWeekSchema).min(1).max(7);

const medicationCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: optionalNullableString(2000),
    conditionTag: optionalNullableString(64),
    form: optionalNullableString(50),
    color: optionalNullableString(50),
    singleDose: optionalNullableNumber(0.01, 100000),
    singleDoseUnit: optionalNullableString(32),
    startDate: medicationDateSchema,
    frequency: medicationFrequencySchema,
    numOfDays: z.coerce.number().int().min(1).max(10).nullable().optional(),
    daysOfWeek: daysOfWeekSchema.optional(),
    intakeTimes: intakeTimesSchema,
    note: optionalNullableString(2000),
  })
  .refine((value) => hasUniqueIntakeTimes(value), {
    message: 'Waktu konsumsi tidak boleh duplikat dalam satu request',
    path: ['intakeTimes'],
  })
  .refine((value) => !value.daysOfWeek || hasUniqueDaysOfWeek(value.daysOfWeek), {
    message: 'Hari konsumsi tidak boleh duplikat dalam satu request',
    path: ['daysOfWeek'],
  })
  .refine((value) => isMedicationScheduleCombinationValid(value), {
    message:
      'Medication harian wajib memakai numOfDays, sedangkan medication mingguan wajib memakai daysOfWeek',
    path: ['frequency'],
  });

const medicationUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: optionalNullableString(2000),
    conditionTag: optionalNullableString(64),
    form: optionalNullableString(50),
    color: optionalNullableString(50),
    singleDose: optionalNullableNumber(0.01, 100000),
    singleDoseUnit: optionalNullableString(32),
    startDate: medicationDateSchema.optional(),
    frequency: medicationFrequencySchema.optional(),
    numOfDays: z.coerce.number().int().min(1).max(10).nullable().optional(),
    daysOfWeek: daysOfWeekSchema.optional(),
    intakeTimes: intakeTimesSchema.optional(),
    note: optionalNullableString(2000),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.conditionTag !== undefined ||
      value.form !== undefined ||
      value.color !== undefined ||
      value.singleDose !== undefined ||
      value.singleDoseUnit !== undefined ||
      value.startDate !== undefined ||
      value.frequency !== undefined ||
      value.numOfDays !== undefined ||
      value.daysOfWeek !== undefined ||
      value.intakeTimes !== undefined ||
      value.note !== undefined,
    {
      message: 'Minimal satu field harus diisi untuk update',
    }
  )
  .refine((value) => !value.intakeTimes || hasUniqueIntakeTimes(value), {
    message: 'Waktu konsumsi tidak boleh duplikat dalam satu request',
    path: ['intakeTimes'],
  })
  .refine((value) => !value.daysOfWeek || hasUniqueDaysOfWeek(value.daysOfWeek), {
    message: 'Hari konsumsi tidak boleh duplikat dalam satu request',
    path: ['daysOfWeek'],
  })
  .refine((value) => hasValidMedicationUpdateCombination(value), {
    message: 'Gunakan numOfDays untuk daily dan daysOfWeek untuk weekly',
    path: ['frequency'],
  });

const reminderCreateSchema = reminderInputSchema.refine(
  (value) => hasUniqueReminderSchedules([value]),
  {
    message: 'Reminder tidak valid',
  }
);

const reminderUpdateSchema = reminderInputSchema.refine(
  (value) => hasUniqueReminderSchedules([value]),
  {
    message: 'Reminder tidak valid',
  }
);

const medicationLogCreateSchema = z.object({
  medicationDate: medicationDateSchema,
  medicationTime: timeStringSchema.optional(),
  status: medicationLogStatusSchema.default('taken'),
});

const medicationListQuerySchema = paginationQuerySchema;
const reminderListQuerySchema = paginationQuerySchema;

const medicationCalendarQuerySchema = z
  .object({
    from: medicationDateSchema,
    to: medicationDateSchema,
  })
  .refine((value) => new Date(value.to).getTime() >= new Date(value.from).getTime(), {
    message: 'to tidak boleh lebih kecil dari from',
    path: ['to'],
  })
  .refine(
    (value) => {
      const milliseconds = new Date(value.to).getTime() - new Date(value.from).getTime();
      const diffDays = Math.floor(milliseconds / (24 * 60 * 60 * 1000)) + 1;
      return diffDays <= maxCalendarRangeDays;
    },
    {
      message: `Rentang kalender maksimal ${maxCalendarRangeDays} hari`,
      path: ['to'],
    }
  );

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
  medicationCalendarQuerySchema,
  medicationCreateSchema,
  medicationUpdateSchema,
  reminderCreateSchema,
  reminderUpdateSchema,
  medicationLogCreateSchema,
  medicationLogQuerySchema,
};
