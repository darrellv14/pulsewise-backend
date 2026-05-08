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

const userIdParamSchema = z.object({
  userId: uuidV4Schema,
});

const doctorIdParamSchema = z.object({
  doctorId: uuidV4Schema,
});

const doctorPatientParamsSchema = z.object({
  doctorId: uuidV4Schema,
  patientId: uuidV4Schema,
});

const patientMlAssessmentParamsSchema = z.object({
  patientId: uuidV4Schema,
  assessmentId: uuidV4Schema,
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

const codedSmallIntSchema = z.coerce.number().int().min(0).max(999).nullable().optional();
const codedDecimalSchema = z.coerce.number().finite().min(0).max(999999).nullable().optional();

const patientMlProfileUpdateSchema = z
  .object({
    demog1_riagendr: codedSmallIntSchema,
    demog1_ridreth3: codedSmallIntSchema,
    demog1_dmdeduc: codedSmallIntSchema,
    demog1_dmdfmsiz: codedSmallIntSchema,
    demog1_dmdhhsiz: codedSmallIntSchema,
    demog1_dmdhhsza: codedSmallIntSchema,
    demog1_dmdhhszb: codedSmallIntSchema,
    demog1_dmdhhsze: codedSmallIntSchema,
    demog1_dmdmartl: codedSmallIntSchema,
    quest22_smq020: codedSmallIntSchema,
    quest22_smq890: codedSmallIntSchema,
    quest22_smq900: codedSmallIntSchema,
    quest23_smd470: codedSmallIntSchema,
    quest1_alq111: codedSmallIntSchema,
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Minimal salah satu field harus diisi',
  });

const patientMlAssessmentsQuerySchema = z
  .object({
    startDate: isoDateOrDateTimeString.optional(),
    endDate: isoDateOrDateTimeString.optional(),
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

const patientMlAssessmentCreateSchema = z.object({
  assessmentDate: isoDateOrDateTimeString,
  exami1_bpxpls: codedSmallIntSchema,
  labor1_lbdtcsi: codedDecimalSchema,
  labor2_urdflow1: codedDecimalSchema,
  labor2_urdtime1: codedDecimalSchema,
  labor2_urxvol1: codedDecimalSchema,
  quest11_hiq011: codedSmallIntSchema,
  quest12_heq010: codedSmallIntSchema,
  quest12_heq030: codedSmallIntSchema,
  quest15_kiq022: codedSmallIntSchema,
  quest15_kiq026: codedSmallIntSchema,
  quest16_mcq010: codedSmallIntSchema,
  quest16_mcq160b: codedSmallIntSchema,
  quest16_mcq220: codedSmallIntSchema,
  quest16_mcq300a: codedSmallIntSchema,
  quest16_mcq300c: codedSmallIntSchema,
  quest17_dpq020: codedSmallIntSchema,
  quest17_dpq030: codedSmallIntSchema,
  quest17_dpq040: codedSmallIntSchema,
  quest20_pfq061b: codedSmallIntSchema,
  quest20_pfq061c: codedSmallIntSchema,
  quest20_pfq061h: codedSmallIntSchema,
  quest3_cdq009: codedSmallIntSchema,
  quest3_cdq010: codedSmallIntSchema,
  quest7_diq010: codedSmallIntSchema,
  quest9_dlq050: codedSmallIntSchema,
});

const patientMlAssessmentUpdateSchema = patientMlAssessmentCreateSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Minimal salah satu field harus diisi',
  });

module.exports = {
  userIdParamSchema,
  patientIdParamSchema,
  doctorIdParamSchema,
  doctorPatientParamsSchema,
  patientMlAssessmentParamsSchema,
  doctorPairingSessionParamsSchema,
  paginationQuerySchema,
  patientProfileUpdateSchema,
  patientMlProfileUpdateSchema,
  patientMlAssessmentsQuerySchema,
  patientMlAssessmentCreateSchema,
  patientMlAssessmentUpdateSchema,
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
