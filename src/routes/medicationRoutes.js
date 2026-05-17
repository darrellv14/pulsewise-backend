const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const medicationController = require('../controllers/medicationController');
const {
  userIdParamSchema,
  medicationParamsSchema,
  reminderParamsSchema,
  medicationListQuerySchema,
  reminderListQuerySchema,
  medicationCalendarQuerySchema,
  medicationCreateSchema,
  medicationUpdateSchema,
  reminderCreateSchema,
  reminderUpdateSchema,
  medicationLogCreateSchema,
  medicationReminderNotificationSchema,
  medicationLogQuerySchema,
} = require('../validators/medicationValidator');

const router = express.Router();

router.get(
  '/users/:userId/medications',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(medicationListQuerySchema, 'query'),
  medicationController.listMedications
);
router.get(
  '/users/:userId/medications/calendar',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(medicationCalendarQuerySchema, 'query'),
  medicationController.listMedicationCalendar
);
router.get(
  '/users/:userId/medications/:medicationId',
  authenticate,
  validateRequest(medicationParamsSchema, 'params'),
  medicationController.getMedicationById
);
router.post(
  '/users/:userId/medications',
  authenticate,
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(medicationCreateSchema),
  medicationController.createMedication
);
router.patch(
  '/users/:userId/medications/:medicationId',
  authenticate,
  validateRequest(medicationParamsSchema, 'params'),
  validateRequest(medicationUpdateSchema),
  medicationController.updateMedication
);
router.delete(
  '/users/:userId/medications/:medicationId',
  authenticate,
  validateRequest(medicationParamsSchema, 'params'),
  medicationController.deleteMedication
);

router.get(
  '/users/:userId/medications/:medicationId/reminders',
  authenticate,
  validateRequest(medicationParamsSchema, 'params'),
  validateRequest(reminderListQuerySchema, 'query'),
  medicationController.listRemindersByMedication
);
router.post(
  '/users/:userId/medications/:medicationId/reminders',
  authenticate,
  validateRequest(medicationParamsSchema, 'params'),
  validateRequest(reminderCreateSchema),
  medicationController.createReminder
);
router.put(
  '/users/:userId/reminders/:reminderId',
  authenticate,
  validateRequest(reminderParamsSchema, 'params'),
  validateRequest(reminderUpdateSchema),
  medicationController.updateReminder
);
router.delete(
  '/users/:userId/reminders/:reminderId',
  authenticate,
  validateRequest(reminderParamsSchema, 'params'),
  medicationController.deleteReminder
);

router.get(
  '/users/:userId/medications/:medicationId/logs',
  authenticate,
  validateRequest(medicationParamsSchema, 'params'),
  validateRequest(medicationLogQuerySchema, 'query'),
  medicationController.listMedicationLogs
);
router.post(
  '/users/:userId/medications/:medicationId/logs',
  authenticate,
  validateRequest(medicationParamsSchema, 'params'),
  validateRequest(medicationLogCreateSchema),
  medicationController.createMedicationLog
);
router.post(
  '/users/:userId/medications/:medicationId/reminder-notification',
  authenticate,
  validateRequest(medicationParamsSchema, 'params'),
  validateRequest(medicationReminderNotificationSchema),
  medicationController.sendMedicationReminderNotification
);

module.exports = router;
