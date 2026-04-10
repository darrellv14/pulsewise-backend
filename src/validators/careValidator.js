const { z } = require('zod');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');

const optionalNullableString = (maxLength) =>
  z.union([z.string().trim().max(maxLength), z.literal(''), z.null()]).optional();

const optionalNullableBoolean = z.union([z.boolean(), z.null()]).optional();
const bloodTypeSchema = z
  .enum(['A', 'A+', 'A-', 'B', 'B+', 'B-', 'AB', 'AB+', 'AB-', 'O', 'O+', 'O-'])
  .nullable()
  .optional();

const isoDateOrDateTimeString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Tanggal tidak valid');

const patientIdParamSchema = z.object({
  patientId: uuidV4Schema,
});

const doctorIdParamSchema = z.object({
  doctorId: uuidV4Schema,
});

const doctorPatientParamsSchema = z.object({
  doctorId: uuidV4Schema,
  patientId: uuidV4Schema,
});

const doctorPairingSessionParamsSchema = z.object({
  doctorId: uuidV4Schema,
  pairingSessionId: uuidV4Schema,
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const patientProfileUpdateSchema = z
  .object({
    dateOfBirth: z.union([isoDateOrDateTimeString, z.null()]).optional(),
    sex: optionalNullableString(16),
    heightCm: z.coerce.number().min(30).max(300).nullable().optional(),
    isSmoking: optionalNullableBoolean,
    isElectricSmoking: optionalNullableBoolean,
    bloodType: bloodTypeSchema,
    address: optionalNullableString(500),
  })
  .refine(
    (value) =>
      value.dateOfBirth !== undefined ||
      value.sex !== undefined ||
      value.heightCm !== undefined ||
      value.isSmoking !== undefined ||
      value.isElectricSmoking !== undefined ||
      value.bloodType !== undefined ||
      value.address !== undefined,
    {
      message: 'Minimal salah satu field harus diisi',
    }
  );

const doctorProfileUpdateSchema = z
  .object({
    specialization: optionalNullableString(120),
    licenseNo: optionalNullableString(120),
    hospitalName: optionalNullableString(150),
  })
  .refine(
    (value) =>
      value.specialization !== undefined ||
      value.licenseNo !== undefined ||
      value.hospitalName !== undefined,
    {
      message: 'Minimal salah satu field harus diisi',
    }
  );

const doctorPatientLinkSchema = z.object({
  patientId: uuidV4Schema,
  source: z.string().trim().max(50).default('manual'),
});

const patientShareCreateSchema = z.object({
  expiresInHours: z.coerce.number().int().min(1).max(168).default(24),
});

const doctorLinkByShareSchema = z.object({
  shareCode: z.string().trim().max(64),
});

const doctorLinkByPatientIdSchema = z.object({
  patientId: uuidV4Schema,
  source: z.string().trim().max(50).default('qr_patient_id'),
});

const dashboardPairingSessionCreateSchema = z.object({
  expiresInSeconds: z.coerce.number().int().min(30).max(300).default(90),
});

const dashboardPairingSessionConfirmSchema = z.object({
  pairingToken: z.string().trim().min(24).max(512),
  source: z.string().trim().max(50).default('qr_dashboard_pairing'),
});

const dashboardPatientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.union([z.string().trim().max(120), z.literal(''), z.null()]).default(''),
});

const dashboardSeriesQuerySchema = z
  .object({
    startDate: isoDateOrDateTimeString.optional(),
    endDate: isoDateOrDateTimeString.optional(),
    timePeriod: z
      .enum([
        'last_7_days',
        'last_14_days',
        'last_30_days',
        'last_3_months',
        'last_6_months',
        'all',
      ])
      .default('last_30_days'),
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
  patientIdParamSchema,
  doctorIdParamSchema,
  doctorPatientParamsSchema,
  doctorPairingSessionParamsSchema,
  paginationQuerySchema,
  patientProfileUpdateSchema,
  doctorProfileUpdateSchema,
  doctorPatientLinkSchema,
  patientShareCreateSchema,
  doctorLinkByShareSchema,
  doctorLinkByPatientIdSchema,
  dashboardPairingSessionCreateSchema,
  dashboardPairingSessionConfirmSchema,
  dashboardPatientsQuerySchema,
  dashboardSeriesQuerySchema,
};
