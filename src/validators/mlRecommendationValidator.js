const { z } = require('zod');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

const patientMlParamsSchema = z.object({
  userId: uuidV4Schema,
});

const patientMlHistoryDetailParamsSchema = z.object({
  userId: uuidV4Schema,
  resultId: uuidV4Schema,
});

const doctorDashboardMlParamsSchema = z.object({
  doctorId: uuidV4Schema,
  patientId: uuidV4Schema,
});

const doctorDashboardMlHistoryDetailParamsSchema = z.object({
  doctorId: uuidV4Schema,
  patientId: uuidV4Schema,
  resultId: uuidV4Schema,
});

const mlRequestQuerySchema = z.object({
  date: dateSchema.optional(),
  includePayload: z.coerce.boolean().optional().default(false),
});

const mlHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

const emptyMlBodySchema = z.object({}).strict();

module.exports = {
  patientMlParamsSchema,
  patientMlHistoryDetailParamsSchema,
  doctorDashboardMlParamsSchema,
  doctorDashboardMlHistoryDetailParamsSchema,
  mlRequestQuerySchema,
  mlHistoryQuerySchema,
  emptyMlBodySchema,
};
