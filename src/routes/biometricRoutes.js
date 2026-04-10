const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const biometricController = require('../controllers/biometricController');
const {
  ingestBiometricsSchema,
  listBiometricsQuerySchema,
} = require('../validators/biometricValidator');

const router = express.Router();

router.post(
  '/biometrics',
  authenticate,
  validateRequest(ingestBiometricsSchema),
  biometricController.ingestBiometrics
);
router.get(
  '/biometrics',
  authenticate,
  validateRequest(listBiometricsQuerySchema, 'query'),
  biometricController.listBiometrics
);

module.exports = router;
