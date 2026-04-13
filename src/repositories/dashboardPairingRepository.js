const prisma = require('../config/prisma');

function mapPairingSession(row) {
  if (!row) {
    return null;
  }

  return {
    pairing_session_id: row.pairingSessionId,
    doctor_id: row.doctorId,
    status: row.status,
    expires_at: row.expiresAt,
    confirmed_at: row.confirmedAt,
    confirmed_by_patient_id: row.confirmedByPatientId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapDoctorPatientLink(row) {
  if (!row) {
    return null;
  }

  return {
    doctor_id: row.doctorId,
    patient_id: row.patientId,
    source: row.source,
    linked_at: row.linkedAt,
    is_active: row.isActive,
  };
}

async function createDashboardPairingSession({ doctorId, pairingTokenHash, expiresAt }) {
  const row = await prisma.dashboardPairingSession.create({
    data: {
      doctorId,
      pairingTokenHash,
      status: 'pending',
      expiresAt: new Date(expiresAt),
    },
  });

  return mapPairingSession(row);
}

async function findDashboardPairingSessionById({ doctorId, pairingSessionId }) {
  const row = await prisma.dashboardPairingSession.findFirst({
    where: {
      doctorId,
      pairingSessionId,
    },
  });

  return mapPairingSession(row);
}

async function findDashboardPairingSessionByTokenHash(pairingTokenHash) {
  const row = await prisma.dashboardPairingSession.findFirst({
    where: {
      pairingTokenHash,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return mapPairingSession(row);
}

async function findActiveDashboardPairingSessionByTokenHash(pairingTokenHash) {
  const row = await prisma.dashboardPairingSession.findFirst({
    where: {
      pairingTokenHash,
      status: 'pending',
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return mapPairingSession(row);
}

async function confirmDashboardPairingSessionAtomic({ pairingTokenHash, patientId, source }) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.dashboardPairingSession.updateMany({
      where: {
        pairingTokenHash,
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedByPatientId: patientId,
        updatedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return null;
    }

    const pairingSession = await tx.dashboardPairingSession.findFirst({
      where: {
        pairingTokenHash,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const doctorPatientLink = await tx.doctorPatient.upsert({
      where: {
        doctorId_patientId: {
          doctorId: pairingSession.doctorId,
          patientId,
        },
      },
      create: {
        doctorId: pairingSession.doctorId,
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

    return {
      pairingSession: mapPairingSession(pairingSession),
      doctorPatientLink: mapDoctorPatientLink(doctorPatientLink),
    };
  });
}

async function markDashboardPairingSessionConfirmed({ pairingSessionId, patientId }) {
  const updated = await prisma.dashboardPairingSession.updateMany({
    where: {
      pairingSessionId,
      status: 'pending',
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedByPatientId: patientId,
      updatedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    return null;
  }

  const row = await prisma.dashboardPairingSession.findUnique({
    where: {
      pairingSessionId,
    },
  });

  return mapPairingSession(row);
}

async function markDashboardPairingSessionExpired(pairingSessionId) {
  const updated = await prisma.dashboardPairingSession.updateMany({
    where: {
      pairingSessionId,
      status: 'pending',
    },
    data: {
      status: 'expired',
      updatedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    return null;
  }

  const row = await prisma.dashboardPairingSession.findUnique({
    where: {
      pairingSessionId,
    },
  });

  return mapPairingSession(row);
}

module.exports = {
  createDashboardPairingSession,
  findDashboardPairingSessionById,
  findDashboardPairingSessionByTokenHash,
  findActiveDashboardPairingSessionByTokenHash,
  confirmDashboardPairingSessionAtomic,
  markDashboardPairingSessionConfirmed,
  markDashboardPairingSessionExpired,
};
