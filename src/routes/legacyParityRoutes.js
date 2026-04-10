const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const legacyParityController = require('../controllers/legacyParityController');
const {
  userIdParamSchema,
  emergencyContactParamsSchema,
  emergencyContactCreateSchema,
  emergencyContactUpdateSchema,
  diaryParamsSchema,
  heartDiaryCreateSchema,
  heartDiaryQuerySchema,
  bodyMetricCreateSchema,
  symptomCreateSchema,
  activityCreateSchema,
  consumptionCreateSchema,
  avatarSignatureQuerySchema,
  avatarSaveSchema,
} = require('../validators/legacyParityValidator');

const router = express.Router();

router.get(
  '/users/:userId/emergency-contacts',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  legacyParityController.listEmergencyContacts
);
router.post(
  '/users/:userId/emergency-contacts',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(emergencyContactCreateSchema),
  legacyParityController.createEmergencyContact
);
router.put(
  '/users/:userId/emergency-contacts/:emergencyContactId',
  authenticate,
  validateRequest(emergencyContactParamsSchema, 'params'),
  validateRequest(emergencyContactUpdateSchema),
  legacyParityController.updateEmergencyContact
);
router.delete(
  '/users/:userId/emergency-contacts/:emergencyContactId',
  authenticate,
  validateRequest(emergencyContactParamsSchema, 'params'),
  legacyParityController.deleteEmergencyContact
);

router.get(
  '/users/:userId/diaries',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(heartDiaryQuerySchema, 'query'),
  legacyParityController.listHeartDiaries
);
router.post(
  '/users/:userId/diaries',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(heartDiaryCreateSchema),
  legacyParityController.upsertHeartDiary
);
router.get(
  '/users/:userId/diaries/:diaryId',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  legacyParityController.getHeartDiaryDetail
);
router.post(
  '/users/:userId/diaries/:diaryId/body-metrics',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  validateRequest(bodyMetricCreateSchema),
  legacyParityController.createDailyBodyMetric
);
router.post(
  '/users/:userId/diaries/:diaryId/symptoms',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  validateRequest(symptomCreateSchema),
  legacyParityController.createDailySymptom
);
router.post(
  '/users/:userId/diaries/:diaryId/activities',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  validateRequest(activityCreateSchema),
  legacyParityController.createDailyActivity
);
router.post(
  '/users/:userId/diaries/:diaryId/consumptions',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  validateRequest(consumptionCreateSchema),
  legacyParityController.createDailyConsumption
);

router.get(
  '/users/:userId/avatar/upload-signature',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(avatarSignatureQuerySchema, 'query'),
  legacyParityController.createAvatarUploadSignature
);
router.put(
  '/users/:userId/avatar',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(avatarSaveSchema),
  legacyParityController.saveAvatarUploadResult
);

module.exports = router;
