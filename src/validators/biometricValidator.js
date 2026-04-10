const { z } = require('zod');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidSchema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');
const isoDateTimeString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Format tanggal tidak valid');

const biometricsReadingSchema = z.object({
  metricType: z.string().trim().min(2).max(64),
  valueNumeric: z.coerce.number().finite().nullable().optional(),
  unit: z.union([z.string().trim().max(32), z.literal(''), z.null()]).optional(),
  measuredAt: isoDateTimeString,
  payload: z.record(z.unknown()).nullable().optional(),
});

const ingestBiometricsSchema = z.object({
  patientId: uuidSchema.optional(),
  source: z.string().trim().min(2).max(64),
  readings: z.array(biometricsReadingSchema).min(1).max(500),
});

const listBiometricsQuerySchema = z
  .object({
    patientId: uuidSchema.optional(),
    source: z.string().trim().min(2).max(64).optional(),
    metricType: z.string().trim().min(2).max(64).optional(),
    startAt: isoDateTimeString.optional(),
    endAt: isoDateTimeString.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine(
    (value) => {
      if (!value.startAt || !value.endAt) {
        return true;
      }

      return new Date(value.endAt).getTime() >= new Date(value.startAt).getTime();
    },
    {
      message: 'endAt tidak boleh lebih kecil dari startAt',
      path: ['endAt'],
    }
  );

module.exports = {
  ingestBiometricsSchema,
  listBiometricsQuerySchema,
};
