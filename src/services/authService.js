const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const { sendOtpEmail } = require('./emailService');
const { normalizeOtp } = require('../utils/otp');

const ALLOWED_ROLES = new Set(['patient', 'doctor', 'admin']);
const googleClient = new OAuth2Client();

function buildAuthPayload(user) {
  return {
    userId: user.user_id,
    email: user.email,
    role: user.role || 'patient',
  };
}

function buildAuthResponse(token, user) {
  return {
    token,
    user: {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarPhoto: user.avatar_photo || null,
      role: user.role || 'patient',
    },
  };
}

function buildUserProfile(user) {
  return {
    userId: user.user_id,
    username: user.username,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    avatarPhoto: user.avatar_photo || null,
    role: user.role || 'patient',
    accountStatus: user.account_status || 'pending_verification',
    emailVerifiedAt: user.email_verified_at || null,
  };
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtpCode(otp) {
  return crypto.createHash('sha256').update(normalizeOtp(otp)).digest('hex');
}

async function register(payload) {
  const username = String(payload.username || '').trim();
  const email = String(payload.email || '')
    .trim()
    .toLowerCase();
  const password = String(payload.password || '');
  const firstName = payload.firstName ? String(payload.firstName).trim() : null;
  const lastName = payload.lastName ? String(payload.lastName).trim() : null;
  const role = payload.role ? String(payload.role).trim().toLowerCase() : 'patient';

  if (!ALLOWED_ROLES.has(role)) {
    const error = new Error('Role tidak valid');
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error('Password minimal 8 karakter');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await userRepository.createUserWithRole({
    username,
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    accountStatus: 'pending_verification',
    emailVerifiedAt: null,
  });

  return {
    user: buildUserProfile(user),
    nextStep: 'EMAIL_VERIFICATION_REQUIRED',
  };
}

async function sendEmailVerification(email) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    const error = new Error('User tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  const otp = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000).toISOString();

  const verification = await userRepository.createEmailVerification({
    userId: user.user_id,
    email: normalizedEmail,
    otpCodeHash: hashOtpCode(otp),
    expiresAt,
  });

  try {
    await sendOtpEmail({
      toEmail: normalizedEmail,
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

  // Opsi debug lokal bila diperlukan testing manual cepat tanpa akses inbox.
  if (env.otpDebugExpose) {
    response.devOtp = otp;
  }

  return response;
}

async function confirmEmailVerification(email, otp) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const verification = await userRepository.findLatestValidEmailVerification(normalizedEmail);

  if (!verification) {
    const error = new Error('OTP tidak ditemukan atau sudah kadaluarsa');
    error.statusCode = 400;
    throw error;
  }

  const isOtpValid = verification.otp_code_hash === hashOtpCode(otp);
  if (!isOtpValid) {
    const error = new Error('OTP tidak valid');
    error.statusCode = 400;
    throw error;
  }

  await userRepository.consumeEmailVerification(verification.verification_id);
  const user = await userRepository.activateUserByEmail(normalizedEmail);

  if (!user) {
    const error = new Error('User tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  return {
    user: buildUserProfile(user),
    accountStatus: 'active',
  };
}

async function login(email, password) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const user = await userRepository.findUserByEmail(normalizedEmail);
  if (!user) {
    const error = new Error('Email atau password salah');
    error.statusCode = 401;
    throw error;
  }

  if (user.account_status !== 'active') {
    const error = new Error('Akun belum aktif, silakan verifikasi email terlebih dahulu');
    error.statusCode = 403;
    throw error;
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    const error = new Error('Email atau password salah');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(buildAuthPayload(user), env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  return buildAuthResponse(token, user);
}

async function loginWithGoogle(idToken, role = 'patient') {
  if (!env.googleClientId) {
    const error = new Error('Google OAuth belum dikonfigurasi di backend');
    error.statusCode = 501;
    throw error;
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
  } catch (verifyError) {
    const error = new Error('Google token tidak valid');
    error.statusCode = 401;
    throw error;
  }

  const payload = ticket.getPayload();
  const email = String(payload?.email || '').toLowerCase();

  if (!email || !payload?.email_verified) {
    const error = new Error('Google token tidak memiliki email terverifikasi');
    error.statusCode = 401;
    throw error;
  }

  const firstName = payload.given_name || null;
  const lastName = payload.family_name || null;
  const placeholderPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);

  const user = await userRepository.createOrGetGoogleUser({
    email,
    firstName,
    lastName,
    role,
    passwordHash: placeholderPasswordHash,
  });

  const token = jwt.sign(buildAuthPayload(user), env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  return buildAuthResponse(token, user);
}

async function getCurrentUser(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    const error = new Error('User tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...buildUserProfile(user),
  };
}

module.exports = {
  register,
  sendEmailVerification,
  confirmEmailVerification,
  login,
  loginWithGoogle,
  getCurrentUser,
};
