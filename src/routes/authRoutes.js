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
router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
