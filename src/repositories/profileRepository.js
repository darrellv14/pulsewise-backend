const prisma = require('../config/prisma');
const CACHE_TTL_SECONDS = 60;
const CACHE_SWR_SECONDS = 120;

const patientSortFieldMap = {
  created_at: 'createdAt',
  date_of_birth: 'dateOfBirth',
  sex: 'sex',
  body_height_cm: 'bodyHeightCm',
  is_smoking: 'isSmoking',
  is_electric_smoking: 'isElectricSmoking',
  blood_type: 'bloodType',
};

function toNullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapPatientProfile(profile) {
  if (!profile) {
    return null;
  }

  return {
    patient_id: profile.patientId,
    date_of_birth: profile.dateOfBirth,
    sex: profile.sex,
    body_height_cm: toNullableNumber(profile.bodyHeightCm),
    healthConnectPreference: profile.healthConnectPreference || null,
    healthConnectStatus: profile.healthConnectStatus || null,
    is_smoking: profile.isSmoking,
    is_electric_smoking: profile.isElectricSmoking,
    blood_type: profile.bloodType,
    created_at: profile.createdAt,
    first_name: profile.user?.firstName || null,
    last_name: profile.user?.lastName || null,
    email: profile.user?.email || null,
    avatar_photo: profile.user?.avatarPhoto || null,
    address: profile.user?.address || null,
  };
}

function mapDoctorProfile(profile) {
  if (!profile) {
    return null;
  }

  return {
    doctor_id: profile.doctorId,
    specialization: profile.specialization,
    license_no: profile.licenseNo,
    hospital_name: profile.hospitalName,
    is_verified: Boolean(profile.isVerified),
    verified_at: profile.verifiedAt || null,
    verified_by: profile.verifiedBy || null,
    verification_note: profile.verificationNote || null,
    rejection_reason: profile.rejectionReason || null,
    created_at: profile.createdAt,
    first_name: profile.user?.firstName || null,
    last_name: profile.user?.lastName || null,
    email: profile.user?.email || null,
    avatar_photo: profile.user?.avatarPhoto || null,
  };
}

function buildCacheStrategy(tags) {
  if (!prisma.$accelerate) {
    return null;
  }

  return {
    ttl: CACHE_TTL_SECONDS,
    swr: CACHE_SWR_SECONDS,
    tags,
  };
}

function withOptionalCacheStrategy(queryArgs, tags) {
  const cacheStrategy = buildCacheStrategy(tags);
  if (!cacheStrategy) {
    return queryArgs;
  }

  return {
    ...queryArgs,
    cacheStrategy,
  };
}

async function invalidateCacheTags(tags) {
  await prisma.$accelerate?.invalidate({ tags });
}

async function listPatientProfiles({ limit, offset, sortBy, order }) {
  const sortField = patientSortFieldMap[sortBy] || 'createdAt';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  const [items, totalItems] = await Promise.all([
    prisma.patientProfile.findMany(
      withOptionalCacheStrategy(
        {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                avatarPhoto: true,
                address: true,
              },
            },
          },
          orderBy: {
            [sortField]: sortOrder,
          },
          skip: offset,
          take: limit,
        },
        ['patient_profiles_list']
      )
    ),
    prisma.patientProfile.count(),
  ]);

  return {
    items: items.map(mapPatientProfile),
    totalItems,
  };
}

async function getPatientProfileById(patientId) {
  const profile = await prisma.patientProfile.findUnique(
    withOptionalCacheStrategy(
      {
        where: {
          patientId,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              avatarPhoto: true,
              address: true,
            },
          },
        },
      },
      [`patient_profile_item_${patientId.replace(/-/g, '_')}`]
    )
  );

  return mapPatientProfile(profile);
}

async function upsertPatientProfile({
  patientId,
  dateOfBirth,
  sex,
  bodyHeightCm,
  healthConnectPreference,
  healthConnectStatus,
  isSmoking,
  isElectricSmoking,
  bloodType,
  address,
}) {
  const profile = await prisma.$transaction(async (tx) => {
    await tx.patientProfile.upsert({
      where: {
        patientId,
      },
      create: {
        patientId,
      },
      update: {},
    });

    const profileData = {};
    if (dateOfBirth !== undefined) {
      profileData.dateOfBirth = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null;
    }
    if (sex !== undefined) {
      profileData.sex = sex;
    }
    if (bodyHeightCm !== undefined) {
      profileData.bodyHeightCm = bodyHeightCm;
    }
    if (healthConnectPreference !== undefined) {
      profileData.healthConnectPreference = healthConnectPreference;
    }
    if (healthConnectStatus !== undefined) {
      profileData.healthConnectStatus = healthConnectStatus;
    }
    if (isSmoking !== undefined) {
      profileData.isSmoking = isSmoking;
    }
    if (isElectricSmoking !== undefined) {
      profileData.isElectricSmoking = isElectricSmoking;
    }
    if (bloodType !== undefined) {
      profileData.bloodType = bloodType;
    }

    if (Object.keys(profileData).length > 0) {
      await tx.patientProfile.update({
        where: {
          patientId,
        },
        data: profileData,
      });
    }

    if (address !== undefined) {
      await tx.user.update({
        where: {
          userId: patientId,
        },
        data: {
          address,
          updatedAt: new Date(),
        },
      });
    }

    return tx.patientProfile.findUnique({
      where: {
        patientId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatarPhoto: true,
            address: true,
          },
        },
      },
    });
  });

  await invalidateCacheTags([
    'patient_profiles_list',
    `patient_profile_item_${patientId.replace(/-/g, '_')}`,
  ]);

  return mapPatientProfile(profile);
}

async function getDoctorProfileById(doctorId) {
  const profile = await prisma.doctorProfile.findUnique(
    withOptionalCacheStrategy(
      {
        where: {
          doctorId,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              avatarPhoto: true,
            },
          },
        },
      },
      [`doctor_profile_item_${doctorId.replace(/-/g, '_')}`]
    )
  );

  return mapDoctorProfile(profile);
}

async function upsertDoctorProfile({ doctorId, specialization, licenseNo, hospitalName }) {
  const profile = await prisma.doctorProfile.upsert({
    where: {
      doctorId,
    },
    create: {
      doctorId,
      specialization,
      licenseNo,
      hospitalName,
      isVerified: false,
    },
    update: {
      specialization,
      licenseNo,
      hospitalName,
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatarPhoto: true,
        },
      },
    },
  });

  await invalidateCacheTags([`doctor_profile_item_${doctorId.replace(/-/g, '_')}`]);

  return mapDoctorProfile(profile);
}

module.exports = {
  listPatientProfiles,
  getPatientProfileById,
  upsertPatientProfile,
  getDoctorProfileById,
  upsertDoctorProfile,
};
