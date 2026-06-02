const { z } = require('zod');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

const smallIntNullableSchema = z.coerce.number().int().min(0).max(999).nullable().optional();
const intNullableSchema = z.coerce.number().int().min(0).max(999999).nullable().optional();
const decimalNullableSchema = z.coerce.number().finite().min(0).max(999999).nullable().optional();

const patientHeartRiskParamsSchema = z.object({
  userId: uuidV4Schema,
});

const patientHeartRiskAssessmentParamsSchema = z.object({
  userId: uuidV4Schema,
  assessmentId: uuidV4Schema,
});

const patientHeartRiskHistoryDetailParamsSchema = z.object({
  userId: uuidV4Schema,
  resultId: uuidV4Schema,
});

const doctorDashboardHeartRiskParamsSchema = z.object({
  doctorId: uuidV4Schema,
  patientId: uuidV4Schema,
});

const doctorDashboardHeartRiskAssessmentParamsSchema = z.object({
  doctorId: uuidV4Schema,
  patientId: uuidV4Schema,
  assessmentId: uuidV4Schema,
});

const doctorDashboardHeartRiskHistoryDetailParamsSchema = z.object({
  doctorId: uuidV4Schema,
  patientId: uuidV4Schema,
  resultId: uuidV4Schema,
});

const heartRiskAssessmentQuerySchema = z
  .object({
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

const heartRiskPredictionQuerySchema = z.object({
  includePayload: z.coerce.boolean().optional().default(false),
});

const heartRiskHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
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

const heartRiskAssessmentCreateSchema = z.object({
  assessmentDate: dateSchema,
  age: intNullableSchema,
  sex: smallIntNullableSchema,
  chest_pain_type: smallIntNullableSchema,
  resting_bp_s: intNullableSchema,
  fasting_blood_sugar: smallIntNullableSchema,
  max_heart_rate: intNullableSchema,
  exercise_angina: smallIntNullableSchema,
  old_peak: decimalNullableSchema,
  st_slope: smallIntNullableSchema,
});

const heartRiskAssessmentUpdateSchema = heartRiskAssessmentCreateSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Minimal salah satu field harus diisi',
  });

const emptyHeartRiskBodySchema = z.object({}).strict();

module.exports = {
  patientHeartRiskParamsSchema,
  patientHeartRiskAssessmentParamsSchema,
  patientHeartRiskHistoryDetailParamsSchema,
  doctorDashboardHeartRiskParamsSchema,
  doctorDashboardHeartRiskAssessmentParamsSchema,
  doctorDashboardHeartRiskHistoryDetailParamsSchema,
  heartRiskAssessmentQuerySchema,
  heartRiskPredictionQuerySchema,
  heartRiskHistoryQuerySchema,
  heartRiskAssessmentCreateSchema,
  heartRiskAssessmentUpdateSchema,
  emptyHeartRiskBodySchema,
};
