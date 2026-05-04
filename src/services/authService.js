const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const { sendOtpEmail } = require('./emailService');
const { normalizeOtp } = require('../utils/otp');

const ALLOWED_ROLES = new Set(['patient', 'doctor', 'admin']);
const GOOGLE_MOBILE_ROLES = new Set(['patient', 'doctor']);
const GOOGLE_REGISTRATION_TOKEN_PURPOSE = 'google_registration';
const GOOGLE_REGISTRATION_TOKEN_EXPIRES_IN = '15m';
const googleClient = new OAuth2Client();

function buildGoogleEmailAlreadyRegisteredError() {
  const error = new Error(
    'Email ini sudah terdaftar dengan metode email/password. Gunakan login email/password.'
  );
  error.statusCode = 409;
  return error;
}

function buildGooglePasswordChangeDisabledError() {
  const error = new Error('Ubah password hanya tersedia untuk akun email/password');
  error.statusCode = 403;
  error.details = {
    nextStep: 'USE_GOOGLE_LOGIN',
  };
  return error;
}

function buildAuthPayload(user) {
  return {
    userId: user.user_id,
    email: user.email,
    role: user.role || 'patient',
  };
}

function buildAuthResponse(token, user) {
  return {
    nextStep: 'HOME',
    accountExists: true,
    registrationCompleted: user.onboarding_completed !== false,
    otpRequired: false,
    token,
    user: {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarPhoto: user.avatar_photo || null,
      role: user.role || 'patient',
      onboardingCompleted: user.onboarding_completed !== false,
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
    onboardingCompleted: user.onboarding_completed !== false,
  };
}

function buildGoogleProfile(payload) {
  return {
    googleSub: String(payload?.sub || ''),
    email: String(payload?.email || '').toLowerCase(),
    firstName: payload?.given_name || null,
    lastName: payload?.family_name || null,
    avatarPhoto: payload?.picture || null,
  };
}

function createGoogleRegistrationToken(googleProfile, role) {
  return jwt.sign(
    {
      purpose: GOOGLE_REGISTRATION_TOKEN_PURPOSE,
      googleSub: googleProfile.googleSub,
      email: googleProfile.email,
      firstName: googleProfile.firstName,
      lastName: googleProfile.lastName,
      avatarPhoto: googleProfile.avatarPhoto,
      role,
    },
    env.jwtSecret,
    {
      expiresIn: GOOGLE_REGISTRATION_TOKEN_EXPIRES_IN,
    }
  );
}

function verifyGoogleRegistrationToken(registrationToken) {
  let decoded;
  try {
    decoded = jwt.verify(registrationToken, env.jwtSecret);
  } catch (_error) {
    const error = new Error('Token registrasi Google tidak valid atau sudah kedaluwarsa');
    error.statusCode = 401;
    throw error;
  }

  if (decoded?.purpose !== GOOGLE_REGISTRATION_TOKEN_PURPOSE) {
    const error = new Error('Token registrasi Google tidak valid');
    error.statusCode = 401;
    throw error;
  }

  const googleProfile = {
    googleSub: String(decoded.googleSub || ''),
    email: String(decoded.email || '').toLowerCase(),
    firstName: decoded.firstName || null,
    lastName: decoded.lastName || null,
    avatarPhoto: decoded.avatarPhoto || null,
  };

  if (!googleProfile.googleSub || !googleProfile.email) {
    const error = new Error('Token registrasi Google tidak lengkap');
    error.statusCode = 401;
    throw error;
  }

  return {
    googleProfile,
    role: GOOGLE_MOBILE_ROLES.has(decoded.role) ? decoded.role : 'patient',
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

  // Opsi debug lokal bila diperlukan testing manual cepat tanpa akses inbox.
  if (env.otpDebugExpose) {
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
    const error = new Error('User tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  return issueEmailVerification(user);
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

async function changePassword(userId, payload) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    const error = new Error('User tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  if (user.google_sub) {
    throw buildGooglePasswordChangeDisabledError();
  }

  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');

  const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidCurrentPassword) {
    const error = new Error('Password saat ini salah');
    error.statusCode = 401;
    throw error;
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
  if (isSamePassword) {
    const error = new Error('Password baru tidak boleh sama dengan password saat ini');
    error.statusCode = 400;
    throw error;
  }

  const nextPasswordHash = await bcrypt.hash(newPassword, 10);
  await userRepository.updateUserPasswordHash(user.user_id, nextPasswordHash);

  return {
    nextStep: 'LOGIN_AGAIN',
  };
}

async function verifyGoogleIdToken(idToken) {
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
  const googleProfile = buildGoogleProfile(payload);

  if (!googleProfile.email || !payload?.email_verified || !googleProfile.googleSub) {
    const error = new Error('Google token tidak memiliki email terverifikasi');
    error.statusCode = 401;
    throw error;
  }

  return googleProfile;
}

async function beginGoogleAuth(idToken, role = 'patient') {
  const requestedRole = GOOGLE_MOBILE_ROLES.has(role) ? role : 'patient';
  const googleProfile = await verifyGoogleIdToken(idToken);
  let user = await userRepository.findUserByGoogleIdentity({
    googleSub: googleProfile.googleSub,
    email: googleProfile.email,
  });

  if (!user) {
    return {
      nextStep: 'COMPLETE_REGISTRATION',
      accountExists: false,
      registrationCompleted: false,
      otpRequired: true,
      registrationToken: createGoogleRegistrationToken(googleProfile, requestedRole),
      role: requestedRole,
      googleProfile: {
        email: googleProfile.email,
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
        avatarPhoto: googleProfile.avatarPhoto,
      },
    };
  }

  if (
    user.email === googleProfile.email &&
    user.google_sub &&
    user.google_sub !== googleProfile.googleSub
  ) {
    const error = new Error('Email ini sudah terhubung ke akun Google lain');
    error.statusCode = 409;
    throw error;
  }

  if (!user.google_sub) {
    throw buildGoogleEmailAlreadyRegisteredError();
  }

  if (user.account_status === 'active' && user.onboarding_completed !== false) {
    const token = jwt.sign(buildAuthPayload(user), env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    return buildAuthResponse(token, user);
  }

  if (user.onboarding_completed === false) {
    return {
      nextStep: 'COMPLETE_REGISTRATION',
      accountExists: true,
      registrationCompleted: false,
      otpRequired: true,
      registrationToken: createGoogleRegistrationToken(
        {
          ...googleProfile,
          firstName: user.first_name || googleProfile.firstName,
          lastName: user.last_name || googleProfile.lastName,
          avatarPhoto: user.avatar_photo || googleProfile.avatarPhoto,
        },
        user.role || requestedRole
      ),
      role: user.role || requestedRole,
      googleProfile: {
        email: user.email,
        firstName: user.first_name || googleProfile.firstName,
        lastName: user.last_name || googleProfile.lastName,
        avatarPhoto: user.avatar_photo || googleProfile.avatarPhoto,
      },
      user: buildUserProfile(user),
    };
  }

  return {
    nextStep: 'VERIFY_OTP',
    accountExists: true,
    registrationCompleted: true,
    otpRequired: true,
    email: user.email,
    user: buildUserProfile(user),
  };
}

async function completeGoogleRegistration(payload) {
  const registrationToken = String(payload.registrationToken || '');
  const username = String(payload.username || '').trim();
  const firstName = payload.firstName ? String(payload.firstName).trim() : null;
  const lastName = payload.lastName ? String(payload.lastName).trim() : null;
  const { googleProfile, role: tokenRole } = verifyGoogleRegistrationToken(registrationToken);
  const role = GOOGLE_MOBILE_ROLES.has(payload.role) ? payload.role : tokenRole;

  let user = await userRepository.findUserByGoogleIdentity({
    googleSub: googleProfile.googleSub,
    email: googleProfile.email,
  });

  if (
    user &&
    user.email === googleProfile.email &&
    user.google_sub &&
    user.google_sub !== googleProfile.googleSub
  ) {
    const error = new Error('Email ini sudah terhubung ke akun Google lain');
    error.statusCode = 409;
    throw error;
  }

  if (user && !user.google_sub) {
    throw buildGoogleEmailAlreadyRegisteredError();
  }

  if (user) {
    if (user.account_status === 'active' && user.onboarding_completed !== false) {
      const error = new Error('Akun Google ini sudah aktif');
      error.statusCode = 409;
      throw error;
    }

    const verification = await issueEmailVerification(user);
    return {
      nextStep: 'VERIFY_OTP',
      accountExists: true,
      registrationCompleted: true,
      otpRequired: true,
      email: user.email,
      user: buildUserProfile(user),
      ...verification,
    };
  }

  const placeholderPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);
  user = await userRepository.createUserWithRole({
    username,
    email: googleProfile.email,
    firstName: firstName || googleProfile.firstName,
    lastName: lastName || googleProfile.lastName,
    role,
    passwordHash: placeholderPasswordHash,
    googleSub: googleProfile.googleSub,
    onboardingCompleted: true,
    accountStatus: 'pending_verification',
    emailVerifiedAt: null,
  });
  const verification = await issueEmailVerification(user);

  return {
    nextStep: 'VERIFY_OTP',
    accountExists: true,
    registrationCompleted: true,
    otpRequired: true,
    email: user.email,
    user: buildUserProfile(user),
    ...verification,
    googleProfile: {
      email: googleProfile.email,
      firstName: googleProfile.firstName,
      lastName: googleProfile.lastName,
      avatarPhoto: googleProfile.avatarPhoto,
    },
  };
}

async function loginWithGoogle(idToken, role = 'patient') {
  return beginGoogleAuth(idToken, role);
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
  changePassword,
  loginWithGoogle,
  beginGoogleAuth,
  completeGoogleRegistration,
  getCurrentUser,
};
