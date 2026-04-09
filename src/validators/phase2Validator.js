const Joi = require('joi');

const patientIdParamSchema = Joi.object({
  patientId: Joi.string().guid({ version: 'uuidv4' }).required(),
});

const doctorIdParamSchema = Joi.object({
  doctorId: Joi.string().guid({ version: 'uuidv4' }).required(),
});

const doctorPatientParamsSchema = Joi.object({
  doctorId: Joi.string().guid({ version: 'uuidv4' }).required(),
  patientId: Joi.string().guid({ version: 'uuidv4' }).required(),
});

const doctorPairingSessionParamsSchema = Joi.object({
  doctorId: Joi.string().guid({ version: 'uuidv4' }).required(),
  pairingSessionId: Joi.string().guid({ version: 'uuidv4' }).required(),
});

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().trim().default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

const patientProfileUpdateSchema = Joi.object({
  dateOfBirth: Joi.date().iso().allow(null),
  sex: Joi.string().trim().max(16).allow('', null),
}).or('dateOfBirth', 'sex');

const doctorProfileUpdateSchema = Joi.object({
  specialization: Joi.string().trim().max(120).allow('', null),
  licenseNo: Joi.string().trim().max(120).allow('', null),
  hospitalName: Joi.string().trim().max(150).allow('', null),
}).or('specialization', 'licenseNo', 'hospitalName');

const doctorPatientLinkSchema = Joi.object({
  patientId: Joi.string().guid({ version: 'uuidv4' }).required(),
  source: Joi.string().trim().max(50).default('manual'),
});

const patientShareCreateSchema = Joi.object({
  expiresInHours: Joi.number().integer().min(1).max(168).default(24),
});

const doctorLinkByShareSchema = Joi.object({
  shareCode: Joi.string().trim().max(64).required(),
});

const doctorLinkByPatientIdSchema = Joi.object({
  patientId: Joi.string().guid({ version: 'uuidv4' }).required(),
  source: Joi.string().trim().max(50).default('qr_patient_id'),
});

const dashboardPairingSessionCreateSchema = Joi.object({
  expiresInSeconds: Joi.number().integer().min(30).max(300).default(90),
});

const dashboardPairingSessionConfirmSchema = Joi.object({
  pairingToken: Joi.string().trim().min(24).max(512).required(),
  source: Joi.string().trim().max(50).default('qr_dashboard_pairing'),
});

const dashboardPatientsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  q: Joi.string().trim().max(120).allow('', null).default(''),
});

const dashboardSeriesQuerySchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  timePeriod: Joi.string()
    .valid('last_7_days', 'last_14_days', 'last_30_days', 'last_3_months', 'last_6_months', 'all')
    .default('last_30_days'),
});

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
