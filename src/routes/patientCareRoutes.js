const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const patientCareController = require('../controllers/patientCareController');
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
  emergencyContactListQuerySchema,
  avatarSignatureQuerySchema,
  avatarSaveSchema,
} = require('../validators/patientCareValidator');

const router = express.Router();

router.get(
  '/users/:userId/emergency-contacts',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(emergencyContactListQuerySchema, 'query'),
  patientCareController.listEmergencyContacts
);
router.post(
  '/users/:userId/emergency-contacts',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(emergencyContactCreateSchema),
  patientCareController.createEmergencyContact
);
router.put(
  '/users/:userId/emergency-contacts/:emergencyContactId',
  authenticate,
  validateRequest(emergencyContactParamsSchema, 'params'),
  validateRequest(emergencyContactUpdateSchema),
  patientCareController.updateEmergencyContact
);
router.delete(
  '/users/:userId/emergency-contacts/:emergencyContactId',
  authenticate,
  validateRequest(emergencyContactParamsSchema, 'params'),
  patientCareController.deleteEmergencyContact
);

router.get(
  '/users/:userId/diaries',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(heartDiaryQuerySchema, 'query'),
  patientCareController.listHeartDiaries
);
router.post(
  '/users/:userId/diaries',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(heartDiaryCreateSchema),
  patientCareController.upsertHeartDiary
);
router.get(
  '/users/:userId/diaries/:diaryId',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  patientCareController.getHeartDiaryDetail
);
router.post(
  '/users/:userId/diaries/:diaryId/body-metrics',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  validateRequest(bodyMetricCreateSchema),
  patientCareController.createDailyBodyMetric
);
router.post(
  '/users/:userId/diaries/:diaryId/symptoms',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  validateRequest(symptomCreateSchema),
  patientCareController.createDailySymptom
);
router.post(
  '/users/:userId/diaries/:diaryId/activities',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  validateRequest(activityCreateSchema),
  patientCareController.createDailyActivity
);
router.post(
  '/users/:userId/diaries/:diaryId/consumptions',
  authenticate,
  validateRequest(diaryParamsSchema, 'params'),
  validateRequest(consumptionCreateSchema),
  patientCareController.createDailyConsumption
);

router.get(
  '/users/:userId/avatar/upload-signature',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(avatarSignatureQuerySchema, 'query'),
  patientCareController.createAvatarUploadSignature
);
router.put(
  '/users/:userId/avatar',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(avatarSaveSchema),
  patientCareController.saveAvatarUploadResult
);

module.exports = router;
