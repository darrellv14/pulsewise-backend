const adminRepository = require('../repositories/adminRepository');
const { ACCOUNT_STATUSES } = require('../constants/enums');
const { normalizePaginationInput, buildPagination } = require('../utils/pagination');
const { createHttpError } = require('../utils/httpError');
const { assertAdminScope } = require('./shared/guards');

const ALLOWED_ADMIN_USER_STATUSES = new Set([
  ACCOUNT_STATUSES.ACTIVE,
  ACCOUNT_STATUSES.SUSPENDED,
]);

async function getDoctorOrThrow(doctorId) {
  const doctor = await adminRepository.getDoctorForReview(doctorId);
  if (!doctor || !doctor.roles.includes('doctor')) {
    throw createHttpError('Dokter tidak ditemukan', 404);
  }

  return doctor;
}

async function getOverview({ actor }) {
  assertAdminScope({ actor });
  return adminRepository.getAdminOverview();
}

async function listUsers({ actor, query }) {
  assertAdminScope({ actor });
  const pagination = normalizePaginationInput({ page: query.page, limit: query.limit });
  const q = String(query.q || '').trim();
  const role = query.role ? String(query.role).trim().toLowerCase() : null;
  const accountStatus = query.accountStatus ? String(query.accountStatus).trim().toLowerCase() : null;

  const result = await adminRepository.listUsers({
    page: pagination.page,
    limit: pagination.limit,
    q,
    role,
    accountStatus,
  });

  return {
    items: result.items,
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      totalItems: result.totalItems,
    }),
  };
}

async function getUserById({ actor, userId }) {
  assertAdminScope({ actor });
  const user = await adminRepository.getUserById(userId);
  if (!user) {
    throw createHttpError('User tidak ditemukan', 404);
  }
  return user;
}

async function updateUserStatus({ actor, userId, accountStatus }) {
  assertAdminScope({ actor });
  if (!ALLOWED_ADMIN_USER_STATUSES.has(accountStatus)) {
    throw createHttpError('Status user tidak valid untuk endpoint admin users', 400);
  }
  const user = await getUserById({ actor, userId });
  if (user.roles.includes('doctor')) {
    throw createHttpError(
      'Status dokter harus diubah melalui endpoint verifikasi dokter admin',
      400
    );
  }

  return adminRepository.updateUserAccountStatus({ userId, accountStatus });
}

async function listDoctorsPending({ actor }) {
  assertAdminScope({ actor });
  return adminRepository.listDoctorsForReview({
    status: ACCOUNT_STATUSES.PENDING_ADMIN_VERIFICATION,
  });
}

async function listDoctors({ actor, query }) {
  assertAdminScope({ actor });
  const status = query.status ? String(query.status).trim().toLowerCase() : null;
  return adminRepository.listDoctorsForReview({ status });
}

async function getDoctorById({ actor, doctorId }) {
  assertAdminScope({ actor });
  return getDoctorOrThrow(doctorId);
}

async function approveDoctor({ actor, doctorId, payload }) {
  assertAdminScope({ actor });
  await getDoctorOrThrow(doctorId);
  return adminRepository.approveDoctor({
    doctorId,
    adminId: actor.userId,
    verificationNote: payload.verificationNote || null,
  });
}

async function rejectDoctor({ actor, doctorId, payload }) {
  assertAdminScope({ actor });
  await getDoctorOrThrow(doctorId);
  return adminRepository.rejectDoctor({
    doctorId,
    rejectionReason: payload.rejectionReason || null,
  });
}

async function suspendDoctor({ actor, doctorId, payload }) {
  assertAdminScope({ actor });
  await getDoctorOrThrow(doctorId);
  return adminRepository.suspendDoctor({
    doctorId,
    verificationNote: payload.verificationNote || null,
  });
}

async function reactivateDoctor({ actor, doctorId }) {
  assertAdminScope({ actor });
  await getDoctorOrThrow(doctorId);
  return adminRepository.reactivateDoctor({ doctorId });
}

module.exports = {
  getOverview,
  listUsers,
  getUserById,
  updateUserStatus,
  listDoctorsPending,
  listDoctors,
  getDoctorById,
  approveDoctor,
  rejectDoctor,
  suspendDoctor,
  reactivateDoctor,
};
