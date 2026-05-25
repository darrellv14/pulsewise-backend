const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const adminController = require('../controllers/adminController');
const {
  adminUserIdParamSchema,
  adminDoctorIdParamSchema,
  adminUsersQuerySchema,
  adminUserStatusUpdateSchema,
  adminDoctorsQuerySchema,
  adminDoctorApproveSchema,
  adminDoctorRejectSchema,
  adminDoctorSuspendSchema,
} = require('../validators/adminValidator');

const router = express.Router();

router.get('/admin/overview', authenticate, adminController.getOverview);
router.get(
  '/admin/users',
  authenticate,
  validateRequest(adminUsersQuerySchema, 'query'),
  adminController.listUsers
);
router.get(
  '/admin/users/:userId',
  authenticate,
  validateRequest(adminUserIdParamSchema, 'params'),
  adminController.getUserById
);
router.patch(
  '/admin/users/:userId/status',
  authenticate,
  validateRequest(adminUserIdParamSchema, 'params'),
  validateRequest(adminUserStatusUpdateSchema),
  adminController.updateUserStatus
);

router.get('/admin/doctors/pending', authenticate, adminController.listDoctorsPending);
router.get(
  '/admin/doctors',
  authenticate,
  validateRequest(adminDoctorsQuerySchema, 'query'),
  adminController.listDoctors
);
router.get(
  '/admin/doctors/:doctorId',
  authenticate,
  validateRequest(adminDoctorIdParamSchema, 'params'),
  adminController.getDoctorById
);
router.post(
  '/admin/doctors/:doctorId/approve',
  authenticate,
  validateRequest(adminDoctorIdParamSchema, 'params'),
  validateRequest(adminDoctorApproveSchema),
  adminController.approveDoctor
);
router.post(
  '/admin/doctors/:doctorId/reject',
  authenticate,
  validateRequest(adminDoctorIdParamSchema, 'params'),
  validateRequest(adminDoctorRejectSchema),
  adminController.rejectDoctor
);
router.post(
  '/admin/doctors/:doctorId/suspend',
  authenticate,
  validateRequest(adminDoctorIdParamSchema, 'params'),
  validateRequest(adminDoctorSuspendSchema),
  adminController.suspendDoctor
);
router.post(
  '/admin/doctors/:doctorId/reactivate',
  authenticate,
  validateRequest(adminDoctorIdParamSchema, 'params'),
  adminController.reactivateDoctor
);

module.exports = router;
