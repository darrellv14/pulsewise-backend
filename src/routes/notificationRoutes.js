const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const notificationController = require('../controllers/notificationController');
const {
  userIdParamSchema,
  registerFcmTokenSchema,
  revokeFcmTokenSchema,
  sendFcmTestSchema,
} = require('../validators/notificationValidator');

const router = express.Router();

router.post(
  '/users/:userId/fcm-tokens',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(registerFcmTokenSchema),
  notificationController.registerFcmToken
);

router.get(
  '/users/:userId/fcm-tokens',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  notificationController.listFcmTokens
);

router.delete(
  '/users/:userId/fcm-tokens',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(revokeFcmTokenSchema),
  notificationController.revokeFcmToken
);

router.post(
  '/users/:userId/fcm-test',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(sendFcmTestSchema),
  notificationController.sendFcmTestNotification
);

module.exports = router;
