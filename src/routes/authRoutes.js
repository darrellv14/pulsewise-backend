const express = require('express');
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const {
	registerSchema,
	loginSchema,
	sendEmailVerificationSchema,
	confirmEmailVerificationSchema,
	googleOauthSchema,
} = require('../validators/authValidator');

const router = express.Router();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/verifications/email', validateRequest(sendEmailVerificationSchema), authController.sendEmailVerification);
router.post(
	'/verifications/email/confirm',
	validateRequest(confirmEmailVerificationSchema),
	authController.confirmEmailVerification
);
router.post('/oauth/google', validateRequest(googleOauthSchema), authController.oauthGoogle);
router.post('/login', validateRequest(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
