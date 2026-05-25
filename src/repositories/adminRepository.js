const prisma = require('../config/prisma');
const { ACCOUNT_STATUSES } = require('../constants/enums');

const ROLE_PRIORITY = {
  admin: 3,
  doctor: 2,
  patient: 1,
};

function resolveRoles(userRoles) {
  const roles = (userRoles || [])
    .map((item) => item?.role?.code)
    .filter(Boolean)
    .sort((left, right) => (ROLE_PRIORITY[right] || 0) - (ROLE_PRIORITY[left] || 0));

  return Array.from(new Set(roles));
}

function mapUserSummary(user) {
  if (!user) {
    return null;
  }

  const roles = resolveRoles(user.userRoles);

  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    avatarPhoto: user.avatarPhoto || null,
    accountStatus: user.accountStatus,
    isActive: user.isActive,
    emailVerifiedAt: user.emailVerifiedAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: roles[0] || null,
    roles,
  };
}

function mapDoctorReview(user) {
  if (!user) {
    return null;
  }

  const base = mapUserSummary(user);

  return {
    ...base,
    doctorProfile: user.doctorProfile
      ? {
          doctorId: user.doctorProfile.doctorId,
          specialization: user.doctorProfile.specialization || null,
          licenseNo: user.doctorProfile.licenseNo || null,
          hospitalName: user.doctorProfile.hospitalName || null,
          isVerified: Boolean(user.doctorProfile.isVerified),
          verifiedAt: user.doctorProfile.verifiedAt || null,
          verifiedBy: user.doctorProfile.verifiedBy || null,
          verificationNote: user.doctorProfile.verificationNote || null,
          rejectionReason: user.doctorProfile.rejectionReason || null,
          createdAt: user.doctorProfile.createdAt,
        }
      : null,
  };
}

function buildUserInclude() {
  return {
    userRoles: {
      include: {
        role: true,
      },
    },
    doctorProfile: true,
  };
}

async function getAdminOverview() {
  const [totalUsers, totalDoctors, totalPatients, totalAdmins, pendingDoctors, suspendedUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.userRole.count({ where: { role: { code: 'doctor' } } }),
      prisma.userRole.count({ where: { role: { code: 'patient' } } }),
      prisma.userRole.count({ where: { role: { code: 'admin' } } }),
      prisma.user.count({
        where: {
          accountStatus: ACCOUNT_STATUSES.PENDING_ADMIN_VERIFICATION,
          userRoles: { some: { role: { code: 'doctor' } } },
        },
      }),
      prisma.user.count({
        where: {
          accountStatus: ACCOUNT_STATUSES.SUSPENDED,
        },
      }),
    ]);

  return {
    totalUsers,
    totalDoctors,
    totalPatients,
    totalAdmins,
    pendingDoctors,
    suspendedUsers,
  };
}

async function listUsers({ page, limit, q, role, accountStatus }) {
  const where = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(role
      ? {
          userRoles: {
            some: {
              role: {
                code: role,
              },
            },
          },
        }
      : {}),
    ...(accountStatus
      ? {
          accountStatus,
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      include: buildUserInclude(),
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map(mapUserSummary),
    totalItems,
  };
}

async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { userId },
    include: buildUserInclude(),
  });

  return mapDoctorReview(user);
}

async function updateUserAccountStatus({ userId, accountStatus }) {
  const user = await prisma.user.update({
    where: { userId },
    data: {
      accountStatus,
      updatedAt: new Date(),
    },
    include: buildUserInclude(),
  });

  return mapDoctorReview(user);
}

async function listDoctorsForReview({ status }) {
  const users = await prisma.user.findMany({
    where: {
      ...(status ? { accountStatus: status } : {}),
      userRoles: {
        some: {
          role: {
            code: 'doctor',
          },
        },
      },
    },
    include: buildUserInclude(),
    orderBy: { createdAt: 'desc' },
  });

  return users.map(mapDoctorReview);
}

async function getDoctorForReview(doctorId) {
  const user = await prisma.user.findUnique({
    where: {
      userId: doctorId,
    },
    include: buildUserInclude(),
  });

  return mapDoctorReview(user);
}

async function approveDoctor({ doctorId, adminId, verificationNote }) {
  const user = await prisma.$transaction(async (tx) => {
    await tx.doctorProfile.upsert({
      where: { doctorId },
      create: {
        doctorId,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminId,
        verificationNote: verificationNote || null,
        rejectionReason: null,
      },
      update: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminId,
        verificationNote: verificationNote || null,
        rejectionReason: null,
      },
    });

    await tx.user.update({
      where: { userId: doctorId },
      data: {
        accountStatus: ACCOUNT_STATUSES.ACTIVE,
        updatedAt: new Date(),
      },
    });

    return tx.user.findUnique({
      where: { userId: doctorId },
      include: buildUserInclude(),
    });
  });

  return mapDoctorReview(user);
}

async function rejectDoctor({ doctorId, rejectionReason }) {
  const user = await prisma.$transaction(async (tx) => {
    await tx.doctorProfile.upsert({
      where: { doctorId },
      create: {
        doctorId,
        isVerified: false,
        rejectionReason: rejectionReason || null,
      },
      update: {
        isVerified: false,
        verifiedAt: null,
        verifiedBy: null,
        rejectionReason: rejectionReason || null,
      },
    });

    await tx.user.update({
      where: { userId: doctorId },
      data: {
        accountStatus: ACCOUNT_STATUSES.REJECTED,
        updatedAt: new Date(),
      },
    });

    return tx.user.findUnique({
      where: { userId: doctorId },
      include: buildUserInclude(),
    });
  });

  return mapDoctorReview(user);
}

async function suspendDoctor({ doctorId, verificationNote }) {
  const user = await prisma.$transaction(async (tx) => {
    await tx.doctorProfile.updateMany({
      where: { doctorId },
      data: {
        verificationNote: verificationNote || null,
      },
    });

    await tx.user.update({
      where: { userId: doctorId },
      data: {
        accountStatus: ACCOUNT_STATUSES.SUSPENDED,
        updatedAt: new Date(),
      },
    });

    return tx.user.findUnique({
      where: { userId: doctorId },
      include: buildUserInclude(),
    });
  });

  return mapDoctorReview(user);
}

async function reactivateDoctor({ doctorId }) {
  const user = await prisma.$transaction(async (tx) => {
    const profile = await tx.doctorProfile.findUnique({
      where: { doctorId },
    });

    await tx.user.update({
      where: { userId: doctorId },
      data: {
        accountStatus: profile?.isVerified
          ? ACCOUNT_STATUSES.ACTIVE
          : ACCOUNT_STATUSES.PENDING_ADMIN_VERIFICATION,
        updatedAt: new Date(),
      },
    });

    return tx.user.findUnique({
      where: { userId: doctorId },
      include: buildUserInclude(),
    });
  });

  return mapDoctorReview(user);
}

module.exports = {
  getAdminOverview,
  listUsers,
  getUserById,
  updateUserAccountStatus,
  listDoctorsForReview,
  getDoctorForReview,
  approveDoctor,
  rejectDoctor,
  suspendDoctor,
  reactivateDoctor,
};
