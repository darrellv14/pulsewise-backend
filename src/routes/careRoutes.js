const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const careController = require('../controllers/careController');
const {
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
} = require('../validators/careValidator');

const router = express.Router();

router.get(
  '/patients',
  authenticate,
  validateRequest(paginationQuerySchema, 'query'),
  careController.listPatients
);
router.get(
  '/patients/:patientId/profile',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  careController.getPatientProfile
);
router.put(
  '/patients/:patientId/profile',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  validateRequest(patientProfileUpdateSchema),
  careController.updatePatientProfile
);
router.get(
  '/patients/:patientId/ml-profile',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  careController.getPatientMlProfile
);
router.put(
  '/patients/:patientId/ml-profile',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  validateRequest(patientMlProfileUpdateSchema),
  careController.updatePatientMlProfile
);
router.get(
  '/patients/:patientId/ml-assessments/latest',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  careController.getLatestPatientMlAssessment
);
router.get(
  '/patients/:patientId/ml-assessments',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  validateRequest(patientMlAssessmentsQuerySchema, 'query'),
  careController.listPatientMlAssessments
);
router.post(
  '/patients/:patientId/ml-assessments',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  validateRequest(patientMlAssessmentCreateSchema),
  careController.createPatientMlAssessment
);
router.put(
  '/patients/:patientId/ml-assessments/:assessmentId',
  authenticate,
  validateRequest(patientMlAssessmentParamsSchema, 'params'),
  validateRequest(patientMlAssessmentUpdateSchema),
  careController.updatePatientMlAssessment
);

router.get(
  '/doctors/:doctorId/profile',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  careController.getDoctorProfile
);
router.put(
  '/doctors/:doctorId/profile',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(doctorProfileUpdateSchema),
  careController.updateDoctorProfile
);

router.get(
  '/doctors/:doctorId/patients',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(paginationQuerySchema, 'query'),
  careController.listDoctorPatients
);
router.post(
  '/doctors/:doctorId/patients',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(doctorPatientLinkSchema),
  careController.linkDoctorPatient
);
router.post(
  '/doctors/:doctorId/patients/link-by-share',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(doctorLinkByShareSchema),
  careController.linkDoctorPatientByShareCode
);
router.post(
  '/doctors/:doctorId/patients/link-by-patient-id',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(doctorLinkByPatientIdSchema),
  careController.linkDoctorPatientByPatientId
);
router.post(
  '/doctors/:doctorId/dashboard/pairing-sessions',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(dashboardPairingSessionCreateSchema),
  careController.createDashboardPairingSession
);
router.get(
  '/doctors/:doctorId/dashboard/pairing-sessions/:pairingSessionId',
  authenticate,
  validateRequest(doctorPairingSessionParamsSchema, 'params'),
  careController.getDashboardPairingSessionStatus
);
router.get(
  '/doctors/:doctorId/dashboard/pairing-sessions/:pairingSessionId/events',
  authenticate,
  validateRequest(doctorPairingSessionParamsSchema, 'params'),
  careController.streamDashboardPairingSessionStatus
);
router.post(
  '/dashboard/pairing-sessions/confirm',
  authenticate,
  validateRequest(dashboardPairingSessionConfirmSchema),
  careController.confirmDashboardPairingSession
);
router.delete(
  '/doctors/:doctorId/patients/:patientId',
  authenticate,
  validateRequest(doctorPatientParamsSchema, 'params'),
  careController.unlinkDoctorPatient
);

router.post(
  '/patients/:patientId/shares',
  authenticate,
  validateRequest(patientIdParamSchema, 'params'),
  validateRequest(patientShareCreateSchema),
  careController.createPatientShare
);

router.get(
  '/doctors/:doctorId/dashboard/patients',
  authenticate,
  validateRequest(doctorIdParamSchema, 'params'),
  validateRequest(dashboardPatientsQuerySchema, 'query'),
  careController.listDoctorDashboardPatients
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId',
  authenticate,
  validateRequest(doctorPatientParamsSchema, 'params'),
  careController.getDoctorDashboardPatientSummary
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/vitals',
  authenticate,
  validateRequest(doctorPatientParamsSchema, 'params'),
  validateRequest(dashboardSeriesQuerySchema, 'query'),
  careController.getDoctorDashboardPatientVitals
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/abnormal-report',
  authenticate,
  validateRequest(doctorPatientParamsSchema, 'params'),
  validateRequest(dashboardSeriesQuerySchema, 'query'),
  careController.getDoctorDashboardAbnormalReport
);

module.exports = router;
