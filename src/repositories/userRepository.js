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

function mapDoctorVerification(doctorProfile) {
  if (!doctorProfile) {
    return null;
  }

  return {
    isVerified: Boolean(doctorProfile.isVerified),
    verifiedAt: doctorProfile.verifiedAt || null,
    verifiedBy: doctorProfile.verifiedBy || null,
    verificationNote: doctorProfile.verificationNote || null,
    rejectionReason: doctorProfile.rejectionReason || null,
  };
}

function buildUserInclude() {
  return {
    userRoles: {
      include: {
        role: true,
      },
    },
    doctorProfile: {
      select: {
        isVerified: true,
        verifiedAt: true,
        verifiedBy: true,
        verificationNote: true,
        rejectionReason: true,
      },
    },
  };
}

function mapUserWithRole(user) {
  if (!user) {
    return null;
  }

  const roles = resolveRoles(user.userRoles);
  const primaryRole = roles[0] || null;

  return {
    user_id: user.userId,
    username: user.username,
    email: user.email,
    password_hash: user.passwordHash,
    avatar_photo: user.avatarPhoto,
    google_sub: user.googleSub,
    onboarding_completed: user.onboardingCompleted,
    account_status: user.accountStatus,
    email_verified_at: user.emailVerifiedAt,
    first_name: user.firstName,
    last_name: user.lastName,
    role: primaryRole,
    roles,
    doctor_verification: mapDoctorVerification(user.doctorProfile),
  };
}

function mapEmailVerification(verification) {
  if (!verification) {
    return null;
  }

  return {
    verification_id: verification.verificationId,
    user_id: verification.userId,
    email: verification.email,
    otp_code_hash: verification.otpCodeHash,
    expires_at: verification.expiresAt,
    consumed_at: verification.consumedAt,
    created_at: verification.createdAt,
  };
}

function isUniqueConstraintError(error) {
  return error?.code === 'P2002';
}

async function findUserByEmail(email) {
  const user = await prisma.user.findFirst({
    where: {
      email,
      isActive: true,
    },
    include: buildUserInclude(),
  });

  return mapUserWithRole(user);
}

async function findUserByGoogleSub(googleSub) {
  if (!googleSub) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      googleSub,
      isActive: true,
    },
    include: buildUserInclude(),
  });

  return mapUserWithRole(user);
}

async function findUserByGoogleIdentity({ googleSub, email }) {
  const byGoogleSub = await findUserByGoogleSub(googleSub);
  if (byGoogleSub) {
    return byGoogleSub;
  }

  if (!email) {
    return null;
  }

  return findUserByEmail(email);
}

async function findUserById(userId) {
  const user = await prisma.user.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: buildUserInclude(),
  });

  return mapUserWithRole(user);
}

async function createUserWithRole({
  username,
  email,
  passwordHash,
  firstName,
  lastName,
  role,
  accountStatus = ACCOUNT_STATUSES.PENDING_VERIFICATION,
  emailVerifiedAt = null,
  googleSub = null,
  onboardingCompleted = true,
}) {
  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          googleSub,
          onboardingCompleted,
          accountStatus,
          emailVerifiedAt: emailVerifiedAt ? new Date(emailVerifiedAt) : null,
          firstName,
          lastName,
        },
      });

      const roleRow = await tx.role.findUnique({
        where: {
          code: role,
        },
      });

      if (!roleRow) {
        const error = new Error('Role tidak ditemukan pada master roles');
        error.statusCode = 500;
        throw error;
      }

      await tx.userRole.create({
        data: {
          userId: user.userId,
          roleId: roleRow.roleId,
        },
      });

      if (role === 'doctor') {
        await tx.doctorProfile.upsert({
          where: {
            doctorId: user.userId,
          },
          create: {
            doctorId: user.userId,
            isVerified: false,
          },
          update: {},
        });
      }

      return tx.user.findUnique({
        where: {
          userId: user.userId,
        },
        include: buildUserInclude(),
      });
    });

    return mapUserWithRole(created);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const conflict = new Error('Username atau email sudah terdaftar');
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  }
}

async function createEmailVerification({ userId, email, otpCodeHash, expiresAt }) {
  const verification = await prisma.emailVerification.create({
    data: {
      userId,
      email,
      otpCodeHash,
      expiresAt: new Date(expiresAt),
    },
  });

  return mapEmailVerification(verification);
}

async function deleteEmailVerificationsByEmail(email) {
  const result = await prisma.emailVerification.deleteMany({
    where: {
      email,
      consumedAt: null,
    },
  });

  return result.count;
}

async function findLatestValidEmailVerification(email) {
  const verification = await prisma.emailVerification.findFirst({
    where: {
      email,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return mapEmailVerification(verification);
}

async function consumeEmailVerification(verificationId) {
  await prisma.emailVerification.updateMany({
    where: {
      verificationId,
    },
    data: {
      consumedAt: new Date(),
    },
  });
}

async function deleteEmailVerification(verificationId) {
  const result = await prisma.emailVerification.deleteMany({
    where: {
      verificationId,
    },
  });

  return result.count > 0;
}

async function activateUserByEmail(email) {
  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: {
        email,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!existing) {
      return null;
    }

    const roles = resolveRoles(existing.userRoles);
    const isDoctor = roles.includes('doctor');

    const updatedUser = await tx.user.update({
      where: {
        email,
      },
      data: {
        accountStatus: isDoctor
          ? ACCOUNT_STATUSES.PENDING_ADMIN_VERIFICATION
          : ACCOUNT_STATUSES.ACTIVE,
        emailVerifiedAt: {
          set: new Date(),
        },
        updatedAt: new Date(),
      },
    });

    if (isDoctor) {
      await tx.doctorProfile.upsert({
        where: {
          doctorId: updatedUser.userId,
        },
        create: {
          doctorId: updatedUser.userId,
          isVerified: false,
        },
        update: {
          isVerified: false,
          verifiedAt: null,
          verifiedBy: null,
          rejectionReason: null,
        },
      });
    }

    return tx.user.findUnique({
      where: {
        userId: updatedUser.userId,
      },
      include: buildUserInclude(),
    });
  });

  return mapUserWithRole(user);
}

async function updatePendingUserRegistration({
  userId,
  username,
  passwordHash,
  firstName,
  lastName,
}) {
  try {
    const user = await prisma.user.update({
      where: {
        userId,
      },
      data: {
        username,
        passwordHash,
        firstName,
        lastName,
        updatedAt: new Date(),
      },
      include: buildUserInclude(),
    });

    return mapUserWithRole(user);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const conflict = new Error('Username atau email sudah terdaftar');
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  }
}

async function linkGoogleIdentity(userId, googleSub) {
  if (!googleSub) {
    return findUserById(userId);
  }

  try {
    const user = await prisma.user.update({
      where: {
        userId,
      },
      data: {
        googleSub,
        updatedAt: new Date(),
      },
      include: buildUserInclude(),
    });

    return mapUserWithRole(user);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const conflict = new Error('Akun Google ini sudah terhubung ke user lain');
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  }
}

async function updateUserPasswordHash(userId, passwordHash) {
  const user = await prisma.user.update({
    where: {
      userId,
    },
    data: {
      passwordHash,
      updatedAt: new Date(),
    },
    include: buildUserInclude(),
  });

  return mapUserWithRole(user);
}

module.exports = {
  findUserByEmail,
  findUserByGoogleSub,
  findUserByGoogleIdentity,
  findUserById,
  createUserWithRole,
  createEmailVerification,
  deleteEmailVerificationsByEmail,
  findLatestValidEmailVerification,
  consumeEmailVerification,
  deleteEmailVerification,
  activateUserByEmail,
  updatePendingUserRegistration,
  linkGoogleIdentity,
  updateUserPasswordHash,
};
