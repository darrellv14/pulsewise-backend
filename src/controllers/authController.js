const authService = require('../services/authService');
const { success } = require('../utils/response');
const { CREATED } = require('../constants/httpStatus');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);

    return success(res, 'Register berhasil', result, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function sendEmailVerification(req, res, next) {
  try {
    const result = await authService.sendEmailVerification(req.body.email);
    return success(res, 'OTP verifikasi berhasil dikirim', result);
  } catch (error) {
    return next(error);
  }
}

async function confirmEmailVerification(req, res, next) {
  try {
    const result = await authService.confirmEmailVerification(req.body.email, req.body.otp);
    return success(res, 'Email berhasil diverifikasi', result);
  } catch (error) {
    return next(error);
  }
}

async function oauthGoogle(req, res, next) {
  try {
    const result = await authService.beginGoogleAuth(req.body.idToken, req.body.role);
    return success(res, 'Autentikasi Google berhasil diproses', result);
  } catch (error) {
    return next(error);
  }
}

async function completeGoogleOauthRegistration(req, res, next) {
  try {
    const result = await authService.completeGoogleRegistration(req.body);
    return success(res, 'Registrasi Google berhasil dilanjutkan', result);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    return success(res, 'Login berhasil', result);
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    return success(res, 'Data user berhasil diambil', user);
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword(req.user.userId, req.body);
    return success(res, 'Password berhasil diperbarui', result);
  } catch (error) {
    return next(error);
  }
}

async function sendForgotPasswordOtp(req, res, next) {
  try {
    const result = await authService.sendForgotPasswordOtp(req.body.email);
    return success(res, 'Jika email terdaftar, kode OTP telah dikirim', result);
  } catch (error) {
    return next(error);
  }
}

async function verifyForgotPasswordOtp(req, res, next) {
  try {
    const result = await authService.verifyForgotPasswordOtp(req.body.email, req.body.otp);
    return success(res, 'OTP berhasil diverifikasi', result);
  } catch (error) {
    return next(error);
  }
}

async function resetForgotPassword(req, res, next) {
  try {
    const result = await authService.resetForgotPassword(
      req.body.resetToken,
      req.body.newPassword
    );
    return success(res, 'Password berhasil direset', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  sendEmailVerification,
  confirmEmailVerification,
  oauthGoogle,
  completeGoogleOauthRegistration,
  login,
  me,
  changePassword,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
};
