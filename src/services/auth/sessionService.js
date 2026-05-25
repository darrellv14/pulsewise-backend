const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const userRepository = require('../../repositories/userRepository');
const { createHttpError } = require('../../utils/httpError');
const { ACCOUNT_STATUSES } = require('../../constants/enums');
const {
  buildAuthPayload,
  buildAuthResponse,
  buildGooglePasswordChangeDisabledError,
  buildUserProfile,
} = require('./shared');
const { verifyForgotPasswordResetToken } = require('./tokenService');

function buildInactiveAccountError(user) {
  if (user.role === 'doctor' && user.account_status === ACCOUNT_STATUSES.PENDING_ADMIN_VERIFICATION) {
    return createHttpError('Akun dokter sedang menunggu verifikasi admin', 403, {
      nextStep: 'WAIT_ADMIN_VERIFICATION',
      accountStatus: user.account_status,
      user: buildUserProfile(user),
    }, { exposeDetails: true });
  }

  if (user.account_status === ACCOUNT_STATUSES.REJECTED) {
    return createHttpError('Akun ditolak oleh admin', 403, {
      nextStep: 'CONTACT_ADMIN',
      accountStatus: user.account_status,
      user: buildUserProfile(user),
    }, { exposeDetails: true });
  }

  if (user.account_status === ACCOUNT_STATUSES.SUSPENDED) {
    return createHttpError('Akun dinonaktifkan oleh admin', 403, {
      nextStep: 'CONTACT_ADMIN',
      accountStatus: user.account_status,
      user: buildUserProfile(user),
    }, { exposeDetails: true });
  }

  return createHttpError('Akun belum aktif, silakan verifikasi email terlebih dahulu', 403, {
    nextStep: 'VERIFY_OTP',
    accountStatus: user.account_status,
    user: buildUserProfile(user),
  }, { exposeDetails: true });
}

async function login(email, password) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const user = await userRepository.findUserByEmail(normalizedEmail);
  if (!user) {
    throw createHttpError('Email atau password salah', 401);
  }

  if (user.account_status !== ACCOUNT_STATUSES.ACTIVE) {
    throw buildInactiveAccountError(user);
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw createHttpError('Email atau password salah', 401);
  }

  const token = jwt.sign(buildAuthPayload(user), env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  return buildAuthResponse(token, user);
}

async function changePassword(userId, payload) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw createHttpError('User tidak ditemukan', 404);
  }

  if (user.google_sub) {
    throw buildGooglePasswordChangeDisabledError();
  }

  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');

  const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidCurrentPassword) {
    throw createHttpError('Password saat ini salah', 401);
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
  if (isSamePassword) {
    throw createHttpError('Password baru tidak boleh sama dengan password saat ini', 400);
  }

  const nextPasswordHash = await bcrypt.hash(newPassword, 10);
  await userRepository.updateUserPasswordHash(user.user_id, nextPasswordHash);

  return {
    nextStep: 'LOGIN_AGAIN',
  };
}

async function resetForgotPassword(resetToken, newPassword) {
  const decoded = verifyForgotPasswordResetToken(resetToken);
  const user = await userRepository.findUserById(decoded.userId);
  if (!user) {
    throw createHttpError('User tidak ditemukan', 404);
  }

  if (user.google_sub) {
    throw createHttpError('Reset password hanya tersedia untuk akun email/password', 403, {
      nextStep: 'USE_GOOGLE_LOGIN',
    });
  }

  const passwordStr = String(newPassword || '');
  if (passwordStr.length < 8) {
    throw createHttpError('Password baru minimal 8 karakter', 400);
  }

  const isSamePassword = user.password_hash
    ? await bcrypt.compare(passwordStr, user.password_hash)
    : false;
  if (isSamePassword) {
    throw createHttpError('Password baru tidak boleh sama dengan password saat ini', 400);
  }

  const newPasswordHash = await bcrypt.hash(passwordStr, 10);
  await userRepository.updateUserPasswordHash(user.user_id, newPasswordHash);

  return {
    nextStep: 'LOGIN_AGAIN',
  };
}

async function getCurrentUser(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw createHttpError('User tidak ditemukan', 404);
  }

  return {
    ...buildUserProfile(user),
  };
}

module.exports = {
  login,
  changePassword,
  resetForgotPassword,
  getCurrentUser,
  buildInactiveAccountError,
};
