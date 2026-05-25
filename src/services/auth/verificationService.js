const env = require('../../config/env');
const userRepository = require('../../repositories/userRepository');
const { sendOtpEmail, sendForgotPasswordOtpEmail } = require('../emailService');
const { createHttpError } = require('../../utils/httpError');
const { ACCOUNT_STATUSES } = require('../../constants/enums');
const { createForgotPasswordResetToken } = require('./tokenService');
const { buildUserProfile, generateOtpCode, hashOtpCode } = require('./shared');

async function issueEmailVerification(user) {
  const otp = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000).toISOString();

  const verification = await userRepository.createEmailVerification({
    userId: user.user_id,
    email: user.email,
    otpCodeHash: hashOtpCode(otp),
    expiresAt,
  });

  try {
    await sendOtpEmail({
      toEmail: user.email,
      otpCode: otp,
      expiresInMinutes: env.otpExpiresMinutes,
    });
  } catch (error) {
    try {
      await userRepository.deleteEmailVerification(verification.verification_id);
    } catch (cleanupError) {
      if (env.nodeEnv !== 'test') {
        console.error('[sendEmailVerification] gagal rollback email verification', cleanupError);
      }
    }

    throw error;
  }

  const response = {
    delivery: 'email',
    expiresInMinutes: env.otpExpiresMinutes,
    nextStep: 'VERIFY_OTP',
  };

  if (env.canExposeOtpDebugData) {
    response.devOtp = otp;
  }

  return response;
}

async function sendEmailVerification(email) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    throw createHttpError('User tidak ditemukan', 404);
  }

  return issueEmailVerification(user);
}

async function confirmEmailVerification(email, otp) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const verification = await userRepository.findLatestValidEmailVerification(normalizedEmail);

  if (!verification) {
    throw createHttpError('OTP tidak ditemukan atau sudah kadaluarsa', 400);
  }

  if (verification.otp_code_hash !== hashOtpCode(otp)) {
    throw createHttpError('OTP tidak valid', 400);
  }

  await userRepository.consumeEmailVerification(verification.verification_id);
  const user = await userRepository.activateUserByEmail(normalizedEmail);

  if (!user) {
    throw createHttpError('User tidak ditemukan', 404);
  }

  return {
    nextStep:
      user.role === 'doctor' &&
      user.account_status === ACCOUNT_STATUSES.PENDING_ADMIN_VERIFICATION
        ? 'WAIT_ADMIN_VERIFICATION'
        : 'HOME',
    user: buildUserProfile(user),
    accountStatus: user.account_status,
  };
}

async function sendForgotPasswordOtp(email) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  const genericResponse = {
    delivery: 'email',
    expiresInMinutes: env.otpExpiresMinutes,
    nextStep: 'VERIFY_FORGOT_PASSWORD_OTP',
  };

  if (!user || user.google_sub) {
    return genericResponse;
  }

  const otp = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000).toISOString();

  const verification = await userRepository.createEmailVerification({
    userId: user.user_id,
    email: user.email,
    otpCodeHash: hashOtpCode(otp),
    expiresAt,
  });

  try {
    await sendForgotPasswordOtpEmail({
      toEmail: user.email,
      otpCode: otp,
      expiresInMinutes: env.otpExpiresMinutes,
    });
  } catch (error) {
    try {
      await userRepository.deleteEmailVerification(verification.verification_id);
    } catch (cleanupError) {
      if (env.nodeEnv !== 'test') {
        console.error('[sendForgotPasswordOtp] gagal rollback email verification', cleanupError);
      }
    }
    throw error;
  }

  if (env.canExposeOtpDebugData) {
    genericResponse.devOtp = otp;
  }

  return genericResponse;
}

async function verifyForgotPasswordOtp(email, otp) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  const user = await userRepository.findUserByEmail(normalizedEmail);
  if (!user) {
    throw createHttpError('OTP tidak valid atau sudah kadaluarsa', 400);
  }

  if (user.google_sub) {
    throw createHttpError('Reset password hanya tersedia untuk akun email/password', 403, {
      nextStep: 'USE_GOOGLE_LOGIN',
    });
  }

  const verification = await userRepository.findLatestValidEmailVerification(normalizedEmail);
  if (!verification || verification.otp_code_hash !== hashOtpCode(otp)) {
    throw createHttpError('OTP tidak valid atau sudah kadaluarsa', 400);
  }

  await userRepository.consumeEmailVerification(verification.verification_id);

  return {
    nextStep: 'RESET_PASSWORD',
    resetToken: createForgotPasswordResetToken(user),
  };
}

module.exports = {
  issueEmailVerification,
  sendEmailVerification,
  confirmEmailVerification,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
};
