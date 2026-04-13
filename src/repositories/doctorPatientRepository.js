const prisma = require('../config/prisma');
const CACHE_TTL_SECONDS = 60;
const CACHE_SWR_SECONDS = 120;

function mapDoctorPatientLink(link) {
  if (!link) {
    return null;
  }

  return {
    doctor_id: link.doctorId,
    patient_id: link.patientId,
    source: link.source,
    linked_at: link.linkedAt,
    is_active: link.isActive,
    first_name: link.patient?.firstName || null,
    last_name: link.patient?.lastName || null,
    email: link.patient?.email || null,
  };
}

function sanitizeTagPart(value) {
  return String(value || '').replace(/[^A-Za-z0-9_]/g, '_');
}

function buildCacheStrategy(tags) {
  return {
    ttl: CACHE_TTL_SECONDS,
    swr: CACHE_SWR_SECONDS,
    tags,
  };
}

async function invalidateCacheTags(tags) {
  await prisma.$accelerate?.invalidate({ tags });
}

async function listDoctorPatients({ doctorId, limit, offset }) {
  const cacheTags = [`doctor_patients_${sanitizeTagPart(doctorId)}`];
  const [items, totalItems] = await Promise.all([
    prisma.doctorPatient.findMany({
      where: {
        doctorId,
        isActive: true,
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        linkedAt: 'desc',
      },
      skip: offset,
      take: limit,
      cacheStrategy: buildCacheStrategy(cacheTags),
    }),
    prisma.doctorPatient.count({
      where: {
        doctorId,
        isActive: true,
      },
      cacheStrategy: buildCacheStrategy(cacheTags),
    }),
  ]);

  return {
    items: items.map(mapDoctorPatientLink),
    totalItems,
  };
}

async function upsertDoctorPatientLink({ doctorId, patientId, source }) {
  const link = await prisma.doctorPatient.upsert({
    where: {
      doctorId_patientId: {
        doctorId,
        patientId,
      },
    },
    create: {
      doctorId,
      patientId,
      source,
      isActive: true,
    },
    update: {
      source,
      linkedAt: new Date(),
      isActive: true,
    },
  });

  await invalidateCacheTags([`doctor_patients_${sanitizeTagPart(doctorId)}`]);

  return mapDoctorPatientLink(link);
}

async function findDoctorPatientLink({ doctorId, patientId }) {
  const link = await prisma.doctorPatient.findFirst({
    where: {
      doctorId,
      patientId,
      isActive: true,
    },
  });

  return mapDoctorPatientLink(link);
}

async function deactivateDoctorPatientLink({ doctorId, patientId }) {
  const link = await prisma.doctorPatient.updateMany({
    where: {
      doctorId,
      patientId,
    },
    data: {
      isActive: false,
    },
  });

  if (link.count === 0) {
    return null;
  }

  const updated = await prisma.doctorPatient.findUnique({
    where: {
      doctorId_patientId: {
        doctorId,
        patientId,
      },
    },
  });

  await invalidateCacheTags([`doctor_patients_${sanitizeTagPart(doctorId)}`]);

  return mapDoctorPatientLink(updated);
}

module.exports = {
  listDoctorPatients,
  upsertDoctorPatientLink,
  findDoctorPatientLink,
  deactivateDoctorPatientLink,
};
