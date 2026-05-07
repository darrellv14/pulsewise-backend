const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const mlRecommendationController = require('../controllers/mlRecommendationController');
const {
  patientMlParamsSchema,
  patientMlHistoryDetailParamsSchema,
  doctorDashboardMlParamsSchema,
  doctorDashboardMlHistoryDetailParamsSchema,
  mlRequestQuerySchema,
  mlHistoryQuerySchema,
  emptyMlBodySchema,
} = require('../validators/mlRecommendationValidator');

const router = express.Router();

router.get(
  '/users/:userId/ml-readiness',
  authenticate,
  validateRequest(patientMlParamsSchema, 'params'),
  validateRequest(mlRequestQuerySchema, 'query'),
  mlRecommendationController.getPatientMlReadiness
);
router.get(
  '/users/:userId/ml-payload',
  authenticate,
  validateRequest(patientMlParamsSchema, 'params'),
  validateRequest(mlRequestQuerySchema, 'query'),
  mlRecommendationController.getPatientMlPayload
);
router.post(
  '/users/:userId/ml-predictions',
  authenticate,
  validateRequest(patientMlParamsSchema, 'params'),
  validateRequest(mlRequestQuerySchema, 'query'),
  validateRequest(emptyMlBodySchema),
  mlRecommendationController.getPatientMlPredictions
);
router.post(
  '/users/:userId/ml-recommendations',
  authenticate,
  validateRequest(patientMlParamsSchema, 'params'),
  validateRequest(mlRequestQuerySchema, 'query'),
  validateRequest(emptyMlBodySchema),
  mlRecommendationController.getPatientMlRecommendations
);
router.get(
  '/users/:userId/ml-predictions/latest',
  authenticate,
  validateRequest(patientMlParamsSchema, 'params'),
  mlRecommendationController.getPatientLatestMlPrediction
);
router.get(
  '/users/:userId/ml-recommendations/latest',
  authenticate,
  validateRequest(patientMlParamsSchema, 'params'),
  mlRecommendationController.getPatientLatestMlRecommendation
);
router.get(
  '/users/:userId/ml-predictions/history',
  authenticate,
  validateRequest(patientMlParamsSchema, 'params'),
  validateRequest(mlHistoryQuerySchema, 'query'),
  mlRecommendationController.listPatientMlPredictionHistory
);
router.get(
  '/users/:userId/ml-predictions/history/:resultId',
  authenticate,
  validateRequest(patientMlHistoryDetailParamsSchema, 'params'),
  mlRecommendationController.getPatientMlPredictionHistoryDetail
);
router.get(
  '/users/:userId/ml-recommendations/history',
  authenticate,
  validateRequest(patientMlParamsSchema, 'params'),
  validateRequest(mlHistoryQuerySchema, 'query'),
  mlRecommendationController.listPatientMlRecommendationHistory
);
router.get(
  '/users/:userId/ml-recommendations/history/:resultId',
  authenticate,
  validateRequest(patientMlHistoryDetailParamsSchema, 'params'),
  mlRecommendationController.getPatientMlRecommendationHistoryDetail
);

router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-readiness',
  authenticate,
  validateRequest(doctorDashboardMlParamsSchema, 'params'),
  validateRequest(mlRequestQuerySchema, 'query'),
  mlRecommendationController.getDoctorDashboardPatientMlReadiness
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-payload',
  authenticate,
  validateRequest(doctorDashboardMlParamsSchema, 'params'),
  validateRequest(mlRequestQuerySchema, 'query'),
  mlRecommendationController.getDoctorDashboardPatientMlPayload
);
router.post(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-predictions',
  authenticate,
  validateRequest(doctorDashboardMlParamsSchema, 'params'),
  validateRequest(mlRequestQuerySchema, 'query'),
  validateRequest(emptyMlBodySchema),
  mlRecommendationController.getDoctorDashboardPatientMlPredictions
);
router.post(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-recommendations',
  authenticate,
  validateRequest(doctorDashboardMlParamsSchema, 'params'),
  validateRequest(mlRequestQuerySchema, 'query'),
  validateRequest(emptyMlBodySchema),
  mlRecommendationController.getDoctorDashboardPatientMlRecommendations
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-predictions/latest',
  authenticate,
  validateRequest(doctorDashboardMlParamsSchema, 'params'),
  mlRecommendationController.getDoctorDashboardPatientLatestMlPrediction
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-recommendations/latest',
  authenticate,
  validateRequest(doctorDashboardMlParamsSchema, 'params'),
  mlRecommendationController.getDoctorDashboardPatientLatestMlRecommendation
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-predictions/history',
  authenticate,
  validateRequest(doctorDashboardMlParamsSchema, 'params'),
  validateRequest(mlHistoryQuerySchema, 'query'),
  mlRecommendationController.listDoctorDashboardPatientMlPredictionHistory
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-predictions/history/:resultId',
  authenticate,
  validateRequest(doctorDashboardMlHistoryDetailParamsSchema, 'params'),
  mlRecommendationController.getDoctorDashboardPatientMlPredictionHistoryDetail
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-recommendations/history',
  authenticate,
  validateRequest(doctorDashboardMlParamsSchema, 'params'),
  validateRequest(mlHistoryQuerySchema, 'query'),
  mlRecommendationController.listDoctorDashboardPatientMlRecommendationHistory
);
router.get(
  '/doctors/:doctorId/dashboard/patients/:patientId/ml-recommendations/history/:resultId',
  authenticate,
  validateRequest(doctorDashboardMlHistoryDetailParamsSchema, 'params'),
  mlRecommendationController.getDoctorDashboardPatientMlRecommendationHistoryDetail
);

module.exports = router;
