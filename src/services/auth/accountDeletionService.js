const bcrypt = require('bcrypt');
const env = require('../../config/env');
const userRepository = require('../../repositories/userRepository');
const { createHttpError } = require('../../utils/httpError');
const { EMAIL_VERIFICATION_PURPOSES } = require('../../constants/enums');
const { sendAccountDeletionOtpEmail } = require('../emailService');
const { verifyGoogleIdToken } = require('./googleService');
const {
  createAccountDeletionToken,
  verifyAccountDeletionToken,
} = require('./tokenService');
const {
  ACCOUNT_DELETION_CONFIRMATION_TEXT,
  ACCOUNT_DELETION_REAUTH_METHODS,
  buildUserProfile,
  generateOtpCode,
  hashOtpCode,
} = require('./shared');

function buildAvailableReauthMethods(user) {
  const methods = [ACCOUNT_DELETION_REAUTH_METHODS.OTP];

  if (user.google_sub) {
    methods.unshift(ACCOUNT_DELETION_REAUTH_METHODS.GOOGLE);
  } else {
    methods.unshift(ACCOUNT_DELETION_REAUTH_METHODS.PASSWORD);
  }

  return methods;
}

function ensureAllowedReauthMethod(user, reauthMethod) {
  const availableReauthMethods = buildAvailableReauthMethods(user);

  if (!availableReauthMethods.includes(reauthMethod)) {
    throw createHttpError(
      'Metode re-autentikasi tidak tersedia untuk akun ini',
      400,
      {
        availableReauthMethods,
        nextStep: 'SELECT_REAUTH_METHOD',
        user: buildUserProfile(user),
      },
      { exposeDetails: true }
    );
  }

  return availableReauthMethods;
}

async function issueAccountDeletionOtp(user) {
  const otp = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000).toISOString();

  await userRepository.deleteEmailVerificationsByEmail(
    user.email,
    EMAIL_VERIFICATION_PURPOSES.ACCOUNT_DELETION
  );

  const verification = await userRepository.createEmailVerification({
    userId: user.user_id,
    email: user.email,
    purpose: EMAIL_VERIFICATION_PURPOSES.ACCOUNT_DELETION,
    otpCodeHash: hashOtpCode(otp),
    expiresAt,
  });

  try {
    await sendAccountDeletionOtpEmail({
      toEmail: user.email,
      otpCode: otp,
      expiresInMinutes: env.otpExpiresMinutes,
    });
  } catch (error) {
    try {
      await userRepository.deleteEmailVerification(verification.verification_id);
    } catch (cleanupError) {
      if (env.nodeEnv !== 'test') {
        console.error('[requestAccountDeletion] gagal rollback OTP hapus akun', cleanupError);
      }
    }

    throw error;
  }

  const response = {
    delivery: 'email',
    expiresInMinutes: env.otpExpiresMinutes,
  };

  if (env.canExposeOtpDebugData) {
    response.devOtp = otp;
  }

  return response;
}

async function requestAccountDeletion(userId, payload) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw createHttpError('User tidak ditemukan', 404);
  }

  const confirmationText = String(payload.confirmationText || '').trim();
  if (confirmationText !== ACCOUNT_DELETION_CONFIRMATION_TEXT) {
    throw createHttpError('Confirmation text harus persis HAPUS AKUN', 400);
  }

  const reauthMethod = String(payload.reauthMethod || '').trim().toLowerCase();
  const availableReauthMethods = ensureAllowedReauthMethod(user, reauthMethod);
  const deletionToken = createAccountDeletionToken({ user, reauthMethod });

  const result = {
    nextStep: 'CONFIRM_ACCOUNT_DELETION',
    requiresReauth: true,
    reauthMethod,
    availableReauthMethods,
    deletionToken,
    warning: {
      permanent: true,
      recoverable: false,
      confirmationText: ACCOUNT_DELETION_CONFIRMATION_TEXT,
    },
  };

  if (reauthMethod === ACCOUNT_DELETION_REAUTH_METHODS.OTP) {
    Object.assign(result, await issueAccountDeletionOtp(user));
  }

  return result;
}

async function verifyAccountDeletionOtp(user, otp) {
  const verification = await userRepository.findLatestValidEmailVerification(
    user.email,
    EMAIL_VERIFICATION_PURPOSES.ACCOUNT_DELETION
  );

  if (!verification || verification.otp_code_hash !== hashOtpCode(otp)) {
    throw createHttpError('OTP penghapusan akun tidak valid atau sudah kedaluwarsa', 400);
  }

  await userRepository.consumeEmailVerification(verification.verification_id);
}

async function verifyAccountDeletionPassword(user, password) {
  if (user.google_sub) {
    throw createHttpError('Password tidak tersedia untuk akun Google', 403, {
      nextStep: 'USE_GOOGLE_REAUTH',
    });
  }

  const isValidPassword = await bcrypt.compare(String(password || ''), user.password_hash || '');
  if (!isValidPassword) {
    throw createHttpError('Password saat ini salah', 401);
  }
}

async function verifyAccountDeletionGoogle(user, googleIdToken) {
  if (!user.google_sub) {
    throw createHttpError('Google re-auth hanya tersedia untuk akun Google', 403, {
      nextStep: 'USE_PASSWORD_OR_OTP',
    });
  }

  const googleProfile = await verifyGoogleIdToken(googleIdToken);
  if (googleProfile.googleSub !== user.google_sub || googleProfile.email !== user.email) {
    throw createHttpError('Google token tidak cocok dengan akun yang sedang login', 401);
  }
}

async function confirmAccountDeletion(userId, payload) {
  const decoded = verifyAccountDeletionToken(String(payload.deletionToken || ''));

  if (decoded.userId !== userId) {
    throw createHttpError('Token penghapusan akun tidak cocok dengan user saat ini', 403);
  }

  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw createHttpError('User tidak ditemukan', 404);
  }

  const reauthMethod = String(decoded.reauthMethod || '').trim().toLowerCase();
  ensureAllowedReauthMethod(user, reauthMethod);

  if (reauthMethod === ACCOUNT_DELETION_REAUTH_METHODS.PASSWORD) {
    await verifyAccountDeletionPassword(user, payload.password);
  } else if (reauthMethod === ACCOUNT_DELETION_REAUTH_METHODS.OTP) {
    await verifyAccountDeletionOtp(user, payload.otp);
  } else if (reauthMethod === ACCOUNT_DELETION_REAUTH_METHODS.GOOGLE) {
    await verifyAccountDeletionGoogle(user, payload.googleIdToken);
  } else {
    throw createHttpError('Metode re-autentikasi tidak valid', 400);
  }

  const deletedAt = new Date().toISOString();
  const deletedUser = await userRepository.deleteUserPermanently(user.user_id);

  return {
    nextStep: 'LOGOUT',
    deleted: true,
    deletedAt,
    reauthMethod,
    sessionRevoked: true,
    user: {
      userId: deletedUser.user_id,
      email: deletedUser.email,
      role: deletedUser.role || 'patient',
    },
  };
}

module.exports = {
  requestAccountDeletion,
  confirmAccountDeletion,
  buildAvailableReauthMethods,
};
