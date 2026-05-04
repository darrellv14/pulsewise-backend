const patientShareRepository = require('../../repositories/patientShareRepository');
const doctorPatientRepository = require('../../repositories/doctorPatientRepository');
const { createHttpError } = require('../../utils/httpError');
const {
  NOT_FOUND,
  assertPatientScope,
  assertDoctorScope,
  generateShareCode,
  toIso,
} = require('./shared');

async function createPatientShare({ actor, patientId, expiresInHours = 24 }) {
  assertPatientScope({ actor, patientId });

  const shareCode = generateShareCode();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const share = await patientShareRepository.createPatientShare({
    patientId,
    shareCode,
    expiresAt,
    createdBy: actor.userId,
  });

  return {
    shareId: share.share_id,
    patientId: share.patient_id,
    shareCode: share.share_code,
    expiresAt: toIso(share.expires_at),
    qrPayload: share.share_code,
  };
}

async function linkDoctorPatientByShareCode({ actor, doctorId, shareCode }) {
  assertDoctorScope({ actor, doctorId });

  const normalizedCode = String(shareCode || '')
    .trim()
    .toUpperCase();
  const share = await patientShareRepository.findActiveShareByCode(normalizedCode);
  if (!share) {
    throw createHttpError('Share code tidak valid atau sudah kadaluarsa', NOT_FOUND);
  }

  const linked = await doctorPatientRepository.upsertDoctorPatientLink({
    doctorId,
    patientId: share.patient_id,
    source: 'qr',
  });

  await patientShareRepository.revokeShare(share.share_id);

  return {
    ...linked,
    linkedByShareCode: normalizedCode,
  };
}

module.exports = {
  createPatientShare,
  linkDoctorPatientByShareCode,
};
