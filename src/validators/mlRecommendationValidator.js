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

const doctorDashboardMlParamsSchema = z.object({
  doctorId: uuidV4Schema,
  patientId: uuidV4Schema,
});

const mlRequestQuerySchema = z.object({
  date: dateSchema.optional(),
  includePayload: z.coerce.boolean().optional().default(false),
});

const emptyMlBodySchema = z.object({}).strict();

module.exports = {
  patientMlParamsSchema,
  doctorDashboardMlParamsSchema,
  mlRequestQuerySchema,
  emptyMlBodySchema,
};
