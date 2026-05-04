const profileRepository = require('../../repositories/profileRepository');
const patientMlRepository = require('../../repositories/patientMlRepository');
const { invalidateByPrefixes } = require('../cache/cacheService');
const {
  dashboardPatientSummaryPrefix,
  dashboardPatientsListPrefix,
} = require('../cache/cacheKeys');
const { normalizePaginationInput } = require('../../utils/pagination');
const { createHttpError } = require('../../utils/httpError');
const {
  NOT_FOUND,
  buildPagination,
  assertPatientResourceAccess,
} = require('./shared');

async function listPatients({ page, limit, sortBy, order }) {
  const pagination = normalizePaginationInput({ page, limit });
  const offset = (pagination.page - 1) * pagination.limit;
  const result = await profileRepository.listPatientProfiles({
    limit: pagination.limit,
    offset,
    sortBy,
    order,
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

async function getPatientProfile(patientId) {
  const profile = await profileRepository.getPatientProfileById(patientId);
  if (!profile) {
    throw createHttpError('Profil pasien tidak ditemukan', NOT_FOUND);
  }

  return profile;
}

async function updatePatientProfile(patientId, payload) {
  const updated = await profileRepository.upsertPatientProfile({
    patientId,
    dateOfBirth: payload.dateOfBirth !== undefined ? payload.dateOfBirth : undefined,
    sex: payload.sex !== undefined ? payload.sex : undefined,
    bodyHeightCm: payload.heightCm !== undefined ? payload.heightCm : undefined,
    isSmoking: payload.isSmoking !== undefined ? payload.isSmoking : undefined,
    isElectricSmoking:
      payload.isElectricSmoking !== undefined ? payload.isElectricSmoking : undefined,
    bloodType: payload.bloodType !== undefined ? payload.bloodType : undefined,
    address: payload.address !== undefined ? payload.address : undefined,
  });

  await invalidateByPrefixes([
    dashboardPatientSummaryPrefix(patientId),
    dashboardPatientsListPrefix(),
  ]);

  return updated;
}

async function getDoctorProfile(doctorId) {
  const profile = await profileRepository.getDoctorProfileById(doctorId);
  if (!profile) {
    throw createHttpError('Profil dokter tidak ditemukan', NOT_FOUND);
  }

  return profile;
}

async function updateDoctorProfile(doctorId, payload) {
  return profileRepository.upsertDoctorProfile({
    doctorId,
    specialization: payload.specialization || null,
    licenseNo: payload.licenseNo || null,
    hospitalName: payload.hospitalName || null,
  });
}

async function getPatientMlProfile({ actor, patientId }) {
  await assertPatientResourceAccess({ actor, patientId });

  const profile = await patientMlRepository.getPatientMlProfileById(patientId);
  if (!profile) {
    throw createHttpError('ML profile pasien tidak ditemukan', NOT_FOUND);
  }

  return profile;
}

async function updatePatientMlProfile({ actor, patientId, payload }) {
  await assertPatientResourceAccess({ actor, patientId });

  return patientMlRepository.upsertPatientMlProfile({
    patientId,
    payload: {
      demog1Riagendr: payload.demog1_riagendr,
      demog1Ridreth3: payload.demog1_ridreth3,
      demog1Dmdeduc: payload.demog1_dmdeduc,
      demog1Dmdfmsiz: payload.demog1_dmdfmsiz,
      demog1Dmdhhsiz: payload.demog1_dmdhhsiz,
      demog1Dmdhhsza: payload.demog1_dmdhhsza,
      demog1Dmdhhszb: payload.demog1_dmdhhszb,
      demog1Dmdhhsze: payload.demog1_dmdhhsze,
      demog1Dmdmartl: payload.demog1_dmdmartl,
      quest22Smq020: payload.quest22_smq020,
      quest22Smq890: payload.quest22_smq890,
      quest22Smq900: payload.quest22_smq900,
      quest23Smd470: payload.quest23_smd470,
      quest1Alq111: payload.quest1_alq111,
    },
  });
}

module.exports = {
  listPatients,
  getPatientProfile,
  updatePatientProfile,
  getDoctorProfile,
  updateDoctorProfile,
  getPatientMlProfile,
  updatePatientMlProfile,
};
