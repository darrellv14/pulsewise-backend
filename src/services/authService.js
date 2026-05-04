const { register } = require('./auth/registrationService');
const {
  sendEmailVerification,
  confirmEmailVerification,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
} = require('./auth/verificationService');
const {
  login,
  changePassword,
  resetForgotPassword,
  getCurrentUser,
} = require('./auth/sessionService');
const {
  loginWithGoogle,
  beginGoogleAuth,
  completeGoogleRegistration,
} = require('./auth/googleService');

module.exports = {
  register,
  sendEmailVerification,
  confirmEmailVerification,
  login,
  changePassword,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
  loginWithGoogle,
  beginGoogleAuth,
  completeGoogleRegistration,
  getCurrentUser,
};
