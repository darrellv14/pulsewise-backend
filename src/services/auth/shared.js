const crypto = require('crypto');
const { normalizeOtp } = require('../../utils/otp');
const { createHttpError } = require('../../utils/httpError');
const { ACCOUNT_STATUSES } = require('../../constants/enums');

const ALLOWED_ROLES = new Set(['patient', 'doctor', 'admin']);
const PUBLIC_REGISTRATION_ROLES = new Set(['patient', 'doctor']);
const GOOGLE_MOBILE_ROLES = new Set(['patient', 'doctor']);
const GOOGLE_REGISTRATION_TOKEN_PURPOSE = 'google_registration';
const GOOGLE_REGISTRATION_TOKEN_EXPIRES_IN = '15m';
const FORGOT_PASSWORD_TOKEN_PURPOSE = 'forgot_password_reset';
const FORGOT_PASSWORD_TOKEN_EXPIRES_IN = '15m';
const ACCOUNT_DELETION_TOKEN_PURPOSE = 'account_deletion';
const ACCOUNT_DELETION_TOKEN_EXPIRES_IN = '15m';
const ACCOUNT_DELETION_CONFIRMATION_TEXT = 'HAPUS AKUN';
const ACCOUNT_DELETION_REAUTH_METHODS = Object.freeze({
  PASSWORD: 'password',
  OTP: 'otp',
  GOOGLE: 'google',
});

function buildGoogleEmailAlreadyRegisteredError() {
  return createHttpError(
    'Email ini sudah terdaftar dengan metode email/password. Gunakan login email/password.',
    409
  );
}

function buildGooglePasswordChangeDisabledError() {
  return createHttpError('Ubah password hanya tersedia untuk akun email/password', 403, {
    nextStep: 'USE_GOOGLE_LOGIN',
  });
}

function buildAuthPayload(user) {
  return {
    userId: user.user_id,
    email: user.email,
    role: user.role || 'patient',
    roles: user.roles || [user.role || 'patient'],
  };
}

function buildAuthResponse(token, user, overrides = {}) {
  return {
    nextStep: 'HOME',
    accountExists: true,
    registrationCompleted: user.onboarding_completed !== false,
    otpRequired: false,
    restrictedAccess: false,
    token,
    user: {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarPhoto: user.avatar_photo || null,
      role: user.role || 'patient',
      roles: user.roles || [user.role || 'patient'],
      accountStatus: user.account_status || ACCOUNT_STATUSES.PENDING_VERIFICATION,
      doctorVerification: user.doctor_verification || null,
      onboardingCompleted: user.onboarding_completed !== false,
    },
    ...overrides,
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
    roles: user.roles || [user.role || 'patient'],
    accountStatus: user.account_status || ACCOUNT_STATUSES.PENDING_VERIFICATION,
    emailVerifiedAt: user.email_verified_at || null,
    doctorVerification: user.doctor_verification || null,
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

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtpCode(otp) {
  return crypto.createHash('sha256').update(normalizeOtp(otp)).digest('hex');
}

module.exports = {
  ALLOWED_ROLES,
  PUBLIC_REGISTRATION_ROLES,
  GOOGLE_MOBILE_ROLES,
  GOOGLE_REGISTRATION_TOKEN_PURPOSE,
  GOOGLE_REGISTRATION_TOKEN_EXPIRES_IN,
  FORGOT_PASSWORD_TOKEN_PURPOSE,
  FORGOT_PASSWORD_TOKEN_EXPIRES_IN,
  ACCOUNT_DELETION_TOKEN_PURPOSE,
  ACCOUNT_DELETION_TOKEN_EXPIRES_IN,
  ACCOUNT_DELETION_CONFIRMATION_TEXT,
  ACCOUNT_DELETION_REAUTH_METHODS,
  buildGoogleEmailAlreadyRegisteredError,
  buildGooglePasswordChangeDisabledError,
  buildAuthPayload,
  buildAuthResponse,
  buildUserProfile,
  buildGoogleProfile,
  generateOtpCode,
  hashOtpCode,
};
