const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const env = require('../../config/env');
const userRepository = require('../../repositories/userRepository');
const { createHttpError } = require('../../utils/httpError');
const { issueEmailVerification } = require('./verificationService');
const { createGoogleRegistrationToken, verifyGoogleRegistrationToken } = require('./tokenService');
const {
  GOOGLE_MOBILE_ROLES,
  buildAuthPayload,
  buildAuthResponse,
  buildGoogleEmailAlreadyRegisteredError,
  buildGoogleProfile,
  buildUserProfile,
} = require('./shared');

const googleClient = new OAuth2Client();

async function verifyGoogleIdToken(idToken) {
  if (!env.googleClientId) {
    throw createHttpError('Google OAuth belum dikonfigurasi di backend', 501);
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
  } catch (_verifyError) {
    throw createHttpError('Google token tidak valid', 401);
  }

  const payload = ticket.getPayload();
  const googleProfile = buildGoogleProfile(payload);

  if (!googleProfile.email || !payload?.email_verified || !googleProfile.googleSub) {
    throw createHttpError('Google token tidak memiliki email terverifikasi', 401);
  }

  return googleProfile;
}

async function beginGoogleAuth(idToken, role = 'patient') {
  const requestedRole = GOOGLE_MOBILE_ROLES.has(role) ? role : 'patient';
  const googleProfile = await verifyGoogleIdToken(idToken);
  const user = await userRepository.findUserByGoogleIdentity({
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
    throw createHttpError('Email ini sudah terhubung ke akun Google lain', 409);
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
    throw createHttpError('Email ini sudah terhubung ke akun Google lain', 409);
  }

  if (user && !user.google_sub) {
    throw buildGoogleEmailAlreadyRegisteredError();
  }

  if (user) {
    if (user.account_status === 'active' && user.onboarding_completed !== false) {
      throw createHttpError('Akun Google ini sudah aktif', 409);
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

module.exports = {
  beginGoogleAuth,
  completeGoogleRegistration,
  loginWithGoogle,
};
