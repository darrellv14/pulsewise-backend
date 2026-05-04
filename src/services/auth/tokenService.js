const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { createHttpError } = require('../../utils/httpError');
const {
  GOOGLE_MOBILE_ROLES,
  GOOGLE_REGISTRATION_TOKEN_PURPOSE,
  GOOGLE_REGISTRATION_TOKEN_EXPIRES_IN,
  FORGOT_PASSWORD_TOKEN_PURPOSE,
  FORGOT_PASSWORD_TOKEN_EXPIRES_IN,
} = require('./shared');

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
    throw createHttpError('Token registrasi Google tidak valid atau sudah kedaluwarsa', 401);
  }

  if (decoded?.purpose !== GOOGLE_REGISTRATION_TOKEN_PURPOSE) {
    throw createHttpError('Token registrasi Google tidak valid', 401);
  }

  const googleProfile = {
    googleSub: String(decoded.googleSub || ''),
    email: String(decoded.email || '').toLowerCase(),
    firstName: decoded.firstName || null,
    lastName: decoded.lastName || null,
    avatarPhoto: decoded.avatarPhoto || null,
  };

  if (!googleProfile.googleSub || !googleProfile.email) {
    throw createHttpError('Token registrasi Google tidak lengkap', 401);
  }

  return {
    googleProfile,
    role: GOOGLE_MOBILE_ROLES.has(decoded.role) ? decoded.role : 'patient',
  };
}

function createForgotPasswordResetToken(user) {
  return jwt.sign(
    {
      purpose: FORGOT_PASSWORD_TOKEN_PURPOSE,
      userId: user.user_id,
      email: user.email,
    },
    env.jwtSecret,
    { expiresIn: FORGOT_PASSWORD_TOKEN_EXPIRES_IN }
  );
}

function verifyForgotPasswordResetToken(resetToken) {
  let decoded;
  try {
    decoded = jwt.verify(resetToken, env.jwtSecret);
  } catch (_error) {
    throw createHttpError('Token reset password tidak valid atau sudah kedaluwarsa', 401);
  }

  if (decoded?.purpose !== FORGOT_PASSWORD_TOKEN_PURPOSE) {
    throw createHttpError('Token reset password tidak valid', 401);
  }

  return decoded;
}

module.exports = {
  createGoogleRegistrationToken,
  verifyGoogleRegistrationToken,
  createForgotPasswordResetToken,
  verifyForgotPasswordResetToken,
};
