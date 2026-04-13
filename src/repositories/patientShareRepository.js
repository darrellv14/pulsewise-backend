const prisma = require('../config/prisma');

function mapPatientShare(share) {
  if (!share) {
    return null;
  }

  return {
    share_id: share.shareId,
    patient_id: share.patientId,
    share_code: share.shareCode,
    expires_at: share.expiresAt,
    created_by: share.createdBy,
    created_at: share.createdAt,
    revoked_at: share.revokedAt,
  };
}

async function createPatientShare({ patientId, shareCode, expiresAt, createdBy }) {
  const share = await prisma.patientShare.create({
    data: {
      patientId,
      shareCode,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy,
    },
  });

  return mapPatientShare(share);
}

async function findActiveShareByCode(shareCode) {
  const share = await prisma.patientShare.findFirst({
    where: {
      shareCode,
      revokedAt: null,
      OR: [
        {
          expiresAt: null,
        },
        {
          expiresAt: {
            gt: new Date(),
          },
        },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return mapPatientShare(share);
}

async function revokeShare(shareId) {
  const share = await prisma.patientShare.update({
    where: {
      shareId,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return mapPatientShare(share);
}

module.exports = {
  createPatientShare,
  findActiveShareByCode,
  revokeShare,
};
