const bcrypt = require('bcrypt');
const userRepository = require('../../repositories/userRepository');
const { createHttpError } = require('../../utils/httpError');
const { ACCOUNT_STATUSES } = require('../../constants/enums');
const { PUBLIC_REGISTRATION_ROLES, buildUserProfile } = require('./shared');
const { issueEmailVerification } = require('./verificationService');

async function register(payload) {
  const username = String(payload.username || '').trim();
  const email = String(payload.email || '')
    .trim()
    .toLowerCase();
  const password = String(payload.password || '');
  const firstName = payload.firstName ? String(payload.firstName).trim() : null;
  const lastName = payload.lastName ? String(payload.lastName).trim() : null;
  const role = payload.role ? String(payload.role).trim().toLowerCase() : 'patient';

  if (!PUBLIC_REGISTRATION_ROLES.has(role)) {
    throw createHttpError('Role tidak valid', 400);
  }

  if (password.length < 8) {
    throw createHttpError('Password minimal 8 karakter', 400);
  }

  const existingUser = await userRepository.findUserByEmail(email);
  const passwordHash = await bcrypt.hash(password, 10);

  if (existingUser) {
    if (existingUser.account_status !== ACCOUNT_STATUSES.PENDING_VERIFICATION) {
      throw createHttpError('Username atau email sudah terdaftar', 409);
    }

    const updatedPendingUser = await userRepository.updatePendingUserRegistration({
      userId: existingUser.user_id,
      username,
      passwordHash,
      firstName,
      lastName,
    });

    await userRepository.deleteEmailVerificationsByEmail(email);
    await issueEmailVerification(updatedPendingUser);

    return {
      user: buildUserProfile(updatedPendingUser),
      nextStep: 'EMAIL_VERIFICATION_REQUIRED',
    };
  }

  const user = await userRepository.createUserWithRole({
    username,
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    accountStatus: ACCOUNT_STATUSES.PENDING_VERIFICATION,
    emailVerifiedAt: null,
  });

  await issueEmailVerification(user);

  return {
    user: buildUserProfile(user),
    nextStep: 'EMAIL_VERIFICATION_REQUIRED',
  };
}

module.exports = {
  register,
};
