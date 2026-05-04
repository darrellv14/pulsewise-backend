const doctorPatientRepository = require('../../repositories/doctorPatientRepository');
const { normalizePaginationInput } = require('../../utils/pagination');
const { createHttpError } = require('../../utils/httpError');
const {
  NOT_FOUND,
  buildPagination,
  assertDoctorScope,
} = require('./shared');

async function listDoctorPatients({ doctorId, page, limit }) {
  const pagination = normalizePaginationInput({ page, limit });
  const offset = (pagination.page - 1) * pagination.limit;
  const result = await doctorPatientRepository.listDoctorPatients({
    doctorId,
    limit: pagination.limit,
    offset,
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

async function linkDoctorPatient({ doctorId, patientId, source }) {
  return doctorPatientRepository.upsertDoctorPatientLink({ doctorId, patientId, source });
}

async function linkDoctorPatientByPatientId({
  actor,
  doctorId,
  patientId,
  source = 'qr_patient_id',
}) {
  assertDoctorScope({ actor, doctorId });

  return doctorPatientRepository.upsertDoctorPatientLink({
    doctorId,
    patientId,
    source,
  });
}

async function unlinkDoctorPatient({ doctorId, patientId }) {
  const link = await doctorPatientRepository.deactivateDoctorPatientLink({ doctorId, patientId });

  if (!link) {
    throw createHttpError('Relasi dokter-pasien tidak ditemukan', NOT_FOUND);
  }

  return link;
}

module.exports = {
  listDoctorPatients,
  linkDoctorPatient,
  linkDoctorPatientByPatientId,
  unlinkDoctorPatient,
};
