const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const mlRecommendationController = require('../controllers/mlRecommendationController');
const {
  patientMlParamsSchema,
  doctorDashboardMlParamsSchema,
  mlRequestQuerySchema,
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

module.exports = router;
