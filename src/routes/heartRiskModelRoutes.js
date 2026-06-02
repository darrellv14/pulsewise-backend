const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const heartRiskModelController = require('../controllers/heartRiskModelController');
const {
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
} = require('../validators/heartRiskModelValidator');

const router = express.Router();

router.get(
  '/users/:userId/heart-risk-model/readiness',
  authenticate,
  validateRequest(patientHeartRiskParamsSchema, 'params'),
  heartRiskModelController.getPatientHeartRiskReadiness
);
router.get(
  '/users/:userId/heart-risk-model/assessment/latest',
  authenticate,
  validateRequest(patientHeartRiskParamsSchema, 'params'),
  heartRiskModelController.getPatientLatestHeartRiskAssessment
);
router.get(
  '/users/:userId/heart-risk-model/assessments',
  authenticate,
  validateRequest(patientHeartRiskParamsSchema, 'params'),
  validateRequest(heartRiskAssessmentQuerySchema, 'query'),
  heartRiskModelController.listPatientHeartRiskAssessments
);
router.post(
  '/users/:userId/heart-risk-model/assessments',
  authenticate,
  validateRequest(patientHeartRiskParamsSchema, 'params'),
  validateRequest(heartRiskAssessmentCreateSchema),
  heartRiskModelController.createPatientHeartRiskAssessment
);
router.put(
  '/users/:userId/heart-risk-model/assessments/:assessmentId',
  authenticate,
  validateRequest(patientHeartRiskAssessmentParamsSchema, 'params'),
  validateRequest(heartRiskAssessmentUpdateSchema),
  heartRiskModelController.updatePatientHeartRiskAssessment
);
router.post(
  '/users/:userId/heart-risk-model/predictions',
  authenticate,
  validateRequest(patientHeartRiskParamsSchema, 'params'),
  validateRequest(heartRiskPredictionQuerySchema, 'query'),
  validateRequest(emptyHeartRiskBodySchema),
  heartRiskModelController.getPatientHeartRiskPredictions
);
router.get(
  '/users/:userId/heart-risk-model/predictions/latest',
  authenticate,
  validateRequest(patientHeartRiskParamsSchema, 'params'),
  heartRiskModelController.getPatientLatestHeartRiskPrediction
);
router.get(
  '/users/:userId/heart-risk-model/predictions/history',
  authenticate,
  validateRequest(patientHeartRiskParamsSchema, 'params'),
  validateRequest(heartRiskHistoryQuerySchema, 'query'),
  heartRiskModelController.listPatientHeartRiskPredictionHistory
);
router.get(
  '/users/:userId/heart-risk-model/predictions/history/:resultId',
  authenticate,
  validateRequest(patientHeartRiskHistoryDetailParamsSchema, 'params'),
  heartRiskModelController.getPatientHeartRiskPredictionHistoryDetail
);

router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/readiness',
  authenticate,
  validateRequest(doctorDashboardHeartRiskParamsSchema, 'params'),
  heartRiskModelController.getDoctorDashboardPatientHeartRiskReadiness
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/assessment/latest',
  authenticate,
  validateRequest(doctorDashboardHeartRiskParamsSchema, 'params'),
  heartRiskModelController.getDoctorDashboardPatientLatestHeartRiskAssessment
);
router.post(
  '/doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/assessments',
  authenticate,
  validateRequest(doctorDashboardHeartRiskParamsSchema, 'params'),
  validateRequest(heartRiskAssessmentCreateSchema),
  heartRiskModelController.createDoctorDashboardPatientHeartRiskAssessment
);
router.put(
  '/doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/assessments/:assessmentId',
  authenticate,
  validateRequest(doctorDashboardHeartRiskAssessmentParamsSchema, 'params'),
  validateRequest(heartRiskAssessmentUpdateSchema),
  heartRiskModelController.updateDoctorDashboardPatientHeartRiskAssessment
);
router.post(
  '/doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/predictions',
  authenticate,
  validateRequest(doctorDashboardHeartRiskParamsSchema, 'params'),
  validateRequest(heartRiskPredictionQuerySchema, 'query'),
  validateRequest(emptyHeartRiskBodySchema),
  heartRiskModelController.getDoctorDashboardPatientHeartRiskPredictions
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/predictions/latest',
  authenticate,
  validateRequest(doctorDashboardHeartRiskParamsSchema, 'params'),
  heartRiskModelController.getDoctorDashboardPatientLatestHeartRiskPrediction
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/predictions/history',
  authenticate,
  validateRequest(doctorDashboardHeartRiskParamsSchema, 'params'),
  validateRequest(heartRiskHistoryQuerySchema, 'query'),
  heartRiskModelController.listDoctorDashboardPatientHeartRiskPredictionHistory
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/predictions/history/:resultId',
  authenticate,
  validateRequest(doctorDashboardHeartRiskHistoryDetailParamsSchema, 'params'),
  heartRiskModelController.getDoctorDashboardPatientHeartRiskPredictionHistoryDetail
);

module.exports = router;
