const bcrypt = require('bcrypt');
const userRepository = require('../../repositories/userRepository');
const { createHttpError } = require('../../utils/httpError');
const { ALLOWED_ROLES, buildUserProfile } = require('./shared');

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
    throw createHttpError('Role tidak valid', 400);
  }

  if (password.length < 8) {
    throw createHttpError('Password minimal 8 karakter', 400);
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

module.exports = {
  register,
};
