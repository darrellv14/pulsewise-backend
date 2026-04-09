const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const phase2Controller = require('../controllers/phase2Controller');
const {
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
} = require('../validators/phase2Validator');

const router = express.Router();

router.get('/patients', authenticate, validateRequest(paginationQuerySchema, 'query'), phase2Controller.listPatients);
router.get(
  '/patients/:patientId/profile',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  phase2Controller.getPatientProfile
);
router.put(
  '/patients/:patientId/profile',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  validateRequest(patientProfileUpdateSchema),
  phase2Controller.updatePatientProfile
);

router.get(
  '/doctors/:doctorId/profile',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  phase2Controller.getDoctorProfile
);
router.put(
  '/doctors/:doctorId/profile',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(doctorProfileUpdateSchema),
  phase2Controller.updateDoctorProfile
);

router.get(
  '/doctors/:doctorId/patients',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(paginationQuerySchema, 'query'),
  phase2Controller.listDoctorPatients
);
router.post(
  '/doctors/:doctorId/patients',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(doctorPatientLinkSchema),
  phase2Controller.linkDoctorPatient
);
router.post(
  '/doctors/:doctorId/patients/link-by-share',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(doctorLinkByShareSchema),
  phase2Controller.linkDoctorPatientByShareCode
);
router.post(
  '/doctors/:doctorId/patients/link-by-patient-id',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(doctorLinkByPatientIdSchema),
  phase2Controller.linkDoctorPatientByPatientId
);
router.post(
  '/doctors/:doctorId/dashboard/pairing-sessions',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(dashboardPairingSessionCreateSchema),
  phase2Controller.createDashboardPairingSession
);
router.get(
  '/doctors/:doctorId/dashboard/pairing-sessions/:pairingSessionId',
  authenticate,
  validateRequest(doctorPairingSessionParamsSchema, 'params'),
  phase2Controller.getDashboardPairingSessionStatus
);
router.get(
  '/doctors/:doctorId/dashboard/pairing-sessions/:pairingSessionId/events',
  authenticate,
  validateRequest(doctorPairingSessionParamsSchema, 'params'),
  phase2Controller.streamDashboardPairingSessionStatus
);
router.post(
  '/dashboard/pairing-sessions/confirm',
  authenticate,
  validateRequest(dashboardPairingSessionConfirmSchema),
  phase2Controller.confirmDashboardPairingSession
);
router.delete(
  '/doctors/:doctorId/patients/:patientId',
  authenticate,
  validateRequest(doctorPatientParamsSchema, 'params'),
  phase2Controller.unlinkDoctorPatient
);

router.post(
  '/patients/:patientId/shares',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  validateRequest(patientShareCreateSchema),
  phase2Controller.createPatientShare
);

router.get(
  '/doctors/:doctorId/dashboard/patients',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(dashboardPatientsQuerySchema, 'query'),
  phase2Controller.listDoctorDashboardPatients
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId',
  authenticate,
  validateRequest(doctorPatientParamsSchema, 'params'),
  phase2Controller.getDoctorDashboardPatientSummary
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/vitals',
  authenticate,
  validateRequest(doctorPatientParamsSchema, 'params'),
  validateRequest(dashboardSeriesQuerySchema, 'query'),
  phase2Controller.getDoctorDashboardPatientVitals
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/abnormal-report',
  authenticate,
  validateRequest(doctorPatientParamsSchema, 'params'),
  validateRequest(dashboardSeriesQuerySchema, 'query'),
  phase2Controller.getDoctorDashboardAbnormalReport
);

module.exports = router;
