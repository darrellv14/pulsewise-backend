const express = require('express');
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const { createRateLimiter } = require('../middlewares/rateLimit');
const env = require('../config/env');
const {
  registerSchema,
  loginSchema,
  sendEmailVerificationSchema,
  confirmEmailVerificationSchema,
  googleOauthSchema,
  googleOauthRegisterSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyForgotPasswordOtpSchema,
  resetForgotPasswordSchema,
  accountDeletionRequestSchema,
  accountDeletionConfirmSchema,
} = require('../validators/authValidator');

const router = express.Router();

const authRateLimiter = createRateLimiter({
  name: 'auth',
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax,
  message: 'Terlalu banyak percobaan autentikasi',
});

router.post('/register', authRateLimiter, validateRequest(registerSchema), authController.register);
router.post(
  '/verifications/email',
  authRateLimiter,
  validateRequest(sendEmailVerificationSchema),
  authController.sendEmailVerification
);
router.post(
  '/verifications/email/confirm',
  authRateLimiter,
  validateRequest(confirmEmailVerificationSchema),
  authController.confirmEmailVerification
);
router.post(
  '/oauth/google',
  authRateLimiter,
  validateRequest(googleOauthSchema),
  authController.oauthGoogle
);
router.post(
  '/oauth/google/register',
  authRateLimiter,
  validateRequest(googleOauthRegisterSchema),
  authController.completeGoogleOauthRegistration
);
router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);
router.post(
  '/change-password',
  authenticate,
  authRateLimiter,
  validateRequest(changePasswordSchema),
  authController.changePassword
);
router.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest(forgotPasswordSchema),
  authController.sendForgotPasswordOtp
);
router.post(
  '/forgot-password/verify',
  authRateLimiter,
  validateRequest(verifyForgotPasswordOtpSchema),
  authController.verifyForgotPasswordOtp
);
router.post(
  '/forgot-password/reset',
  authRateLimiter,
  validateRequest(resetForgotPasswordSchema),
  authController.resetForgotPassword
);
router.post(
  '/account-deletion/request',
  authenticate,
  authRateLimiter,
  validateRequest(accountDeletionRequestSchema),
  authController.requestAccountDeletion
);
router.post(
  '/account-deletion/confirm',
  authenticate,
  authRateLimiter,
  validateRequest(accountDeletionConfirmSchema),
  authController.confirmAccountDeletion
);

module.exports = router;
