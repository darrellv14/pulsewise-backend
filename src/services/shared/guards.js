const { FORBIDDEN } = require('../../constants/httpStatus');
const doctorPatientRepository = require('../../repositories/doctorPatientRepository');
const { createHttpError } = require('../../utils/httpError');
const { ACCOUNT_STATUSES } = require('../../constants/enums');

const DEFAULT_DOCTOR_SCOPE_MESSAGES = {
  invalidActor: 'Aktor tidak valid',
  roleDenied: 'Role tidak memiliki akses dashboard dokter',
  scopeDenied: 'Akses dashboard dokter ditolak',
};

const DEFAULT_PATIENT_SCOPE_MESSAGES = {
  invalidActor: 'Aktor tidak valid',
  roleDenied: 'Role tidak memiliki akses pasien',
  scopeDenied: 'Akses data pasien ditolak',
};

const DEFAULT_USER_SCOPE_MESSAGES = {
  invalidActor: 'Aktor tidak valid',
  scopeDenied: 'Akses data user ditolak',
};

const DEFAULT_ADMIN_SCOPE_MESSAGES = {
  invalidActor: 'Aktor tidak valid',
  roleDenied: 'Role tidak memiliki akses admin',
};

const DEFAULT_DOCTOR_PROFILE_SCOPE_MESSAGES = {
  invalidActor: 'Aktor tidak valid',
  roleDenied: 'Role tidak memiliki akses profil dokter',
  scopeDenied: 'Akses profil dokter ditolak',
};

const DEFAULT_PATIENT_RESOURCE_MESSAGES = {
  invalidActor: 'Aktor tidak valid',
  roleDenied: 'Role tidak memiliki akses pasien',
  scopeDenied: 'Akses data pasien ditolak',
  linkDenied: 'Dokter tidak memiliki akses ke pasien ini',
};

function resolveMessages(defaults, overrides) {
  return {
    ...defaults,
    ...(overrides || {}),
  };
}

function assertDoctorScope({ actor, doctorId, messages }) {
  const resolved = resolveMessages(DEFAULT_DOCTOR_SCOPE_MESSAGES, messages);

  if (!actor) {
    throw createHttpError(resolved.invalidActor, FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'doctor') {
    throw createHttpError(resolved.roleDenied, FORBIDDEN);
  }

  if (actor.accountStatus !== ACCOUNT_STATUSES.ACTIVE) {
    throw createHttpError(
      'Akun dokter sedang menunggu verifikasi admin',
      FORBIDDEN,
      {
        nextStep: 'WAIT_ADMIN_VERIFICATION',
        accountStatus: actor.accountStatus,
      },
      { exposeDetails: true }
    );
  }

  if (actor.userId !== doctorId) {
    throw createHttpError(resolved.scopeDenied, FORBIDDEN);
  }
}

function assertDoctorProfileScope({ actor, doctorId, messages }) {
  const resolved = resolveMessages(DEFAULT_DOCTOR_PROFILE_SCOPE_MESSAGES, messages);

  if (!actor) {
    throw createHttpError(resolved.invalidActor, FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'doctor') {
    throw createHttpError(resolved.roleDenied, FORBIDDEN);
  }

  if (actor.userId !== doctorId) {
    throw createHttpError(resolved.scopeDenied, FORBIDDEN);
  }

  if (
    actor.accountStatus !== ACCOUNT_STATUSES.ACTIVE &&
    actor.accountStatus !== ACCOUNT_STATUSES.PENDING_ADMIN_VERIFICATION
  ) {
    throw createHttpError(resolved.scopeDenied, FORBIDDEN);
  }
}

function assertPatientScope({ actor, patientId, messages }) {
  const resolved = resolveMessages(DEFAULT_PATIENT_SCOPE_MESSAGES, messages);

  if (!actor) {
    throw createHttpError(resolved.invalidActor, FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'patient') {
    throw createHttpError(resolved.roleDenied, FORBIDDEN);
  }

  if (actor.userId !== patientId) {
    throw createHttpError(resolved.scopeDenied, FORBIDDEN);
  }
}

function assertAdminScope({ actor, messages }) {
  const resolved = resolveMessages(DEFAULT_ADMIN_SCOPE_MESSAGES, messages);

  if (!actor) {
    throw createHttpError(resolved.invalidActor, FORBIDDEN);
  }

  if (actor.role !== 'admin') {
    throw createHttpError(resolved.roleDenied, FORBIDDEN);
  }
}

function assertUserScope({ actor, userId, messages }) {
  const resolved = resolveMessages(DEFAULT_USER_SCOPE_MESSAGES, messages);

  if (!actor) {
    throw createHttpError(resolved.invalidActor, FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.userId !== userId) {
    throw createHttpError(resolved.scopeDenied, FORBIDDEN);
  }
}

async function assertDoctorPatientLinkedAccess({ doctorId, patientId, message }) {
  const link = await doctorPatientRepository.findDoctorPatientLink({
    doctorId,
    patientId,
  });

  if (!link) {
    throw createHttpError(message || DEFAULT_PATIENT_RESOURCE_MESSAGES.linkDenied, FORBIDDEN);
  }

  return link;
}

async function assertPatientResourceAccess({ actor, patientId, messages }) {
  const resolved = resolveMessages(DEFAULT_PATIENT_RESOURCE_MESSAGES, messages);

  if (!actor) {
    throw createHttpError(resolved.invalidActor, FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role === 'patient') {
    if (actor.userId !== patientId) {
      throw createHttpError(resolved.scopeDenied, FORBIDDEN);
    }

    return;
  }

  if (actor.role === 'doctor') {
    await assertDoctorPatientLinkedAccess({
      doctorId: actor.userId,
      patientId,
      message: resolved.linkDenied,
    });

    return;
  }

  throw createHttpError(resolved.roleDenied, FORBIDDEN);
}

module.exports = {
  assertAdminScope,
  assertDoctorScope,
  assertDoctorProfileScope,
  assertPatientScope,
  assertUserScope,
  assertDoctorPatientLinkedAccess,
  assertPatientResourceAccess,
};
