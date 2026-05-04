const patientMlRepository = require('../../repositories/patientMlRepository');
const { createHttpError } = require('../../utils/httpError');
const { NOT_FOUND, assertPatientResourceAccess } = require('./shared');

async function getLatestPatientMlAssessment({ actor, patientId }) {
  await assertPatientResourceAccess({ actor, patientId });

  const assessment = await patientMlRepository.getLatestPatientMlAssessment(patientId);
  if (!assessment) {
    throw createHttpError('Assessment ML pasien tidak ditemukan', NOT_FOUND);
  }

  return assessment;
}

async function listPatientMlAssessments({ actor, patientId, query }) {
  await assertPatientResourceAccess({ actor, patientId });

  const items = await patientMlRepository.listPatientMlAssessments({
    patientId,
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return {
    items,
  };
}

async function createPatientMlAssessment({ actor, patientId, payload }) {
  await assertPatientResourceAccess({ actor, patientId });

  return patientMlRepository.createPatientMlAssessment({
    patientId,
    payload: {
      assessmentDate: payload.assessmentDate,
      exami1Bpxpls: payload.exami1_bpxpls,
      labor1Lbdtcsi: payload.labor1_lbdtcsi,
      labor2Urdflow1: payload.labor2_urdflow1,
      labor2Urdtime1: payload.labor2_urdtime1,
      labor2Urxvol1: payload.labor2_urxvol1,
      quest11Hiq011: payload.quest11_hiq011,
      quest12Heq010: payload.quest12_heq010,
      quest12Heq030: payload.quest12_heq030,
      quest15Kiq022: payload.quest15_kiq022,
      quest15Kiq026: payload.quest15_kiq026,
      quest16Mcq010: payload.quest16_mcq010,
      quest16Mcq160b: payload.quest16_mcq160b,
      quest16Mcq220: payload.quest16_mcq220,
      quest16Mcq300a: payload.quest16_mcq300a,
      quest16Mcq300c: payload.quest16_mcq300c,
      quest17Dpq020: payload.quest17_dpq020,
      quest17Dpq030: payload.quest17_dpq030,
      quest17Dpq040: payload.quest17_dpq040,
      quest20Pfq061b: payload.quest20_pfq061b,
      quest20Pfq061c: payload.quest20_pfq061c,
      quest20Pfq061h: payload.quest20_pfq061h,
      quest3Cdq009: payload.quest3_cdq009,
      quest3Cdq010: payload.quest3_cdq010,
      quest7Diq010: payload.quest7_diq010,
      quest9Dlq050: payload.quest9_dlq050,
    },
  });
}

async function updatePatientMlAssessment({ actor, patientId, assessmentId, payload }) {
  await assertPatientResourceAccess({ actor, patientId });

  const assessment = await patientMlRepository.updatePatientMlAssessment({
    patientId,
    assessmentId,
    payload: {
      assessmentDate: payload.assessmentDate,
      exami1Bpxpls: payload.exami1_bpxpls,
      labor1Lbdtcsi: payload.labor1_lbdtcsi,
      labor2Urdflow1: payload.labor2_urdflow1,
      labor2Urdtime1: payload.labor2_urdtime1,
      labor2Urxvol1: payload.labor2_urxvol1,
      quest11Hiq011: payload.quest11_hiq011,
      quest12Heq010: payload.quest12_heq010,
      quest12Heq030: payload.quest12_heq030,
      quest15Kiq022: payload.quest15_kiq022,
      quest15Kiq026: payload.quest15_kiq026,
      quest16Mcq010: payload.quest16_mcq010,
      quest16Mcq160b: payload.quest16_mcq160b,
      quest16Mcq220: payload.quest16_mcq220,
      quest16Mcq300a: payload.quest16_mcq300a,
      quest16Mcq300c: payload.quest16_mcq300c,
      quest17Dpq020: payload.quest17_dpq020,
      quest17Dpq030: payload.quest17_dpq030,
      quest17Dpq040: payload.quest17_dpq040,
      quest20Pfq061b: payload.quest20_pfq061b,
      quest20Pfq061c: payload.quest20_pfq061c,
      quest20Pfq061h: payload.quest20_pfq061h,
      quest3Cdq009: payload.quest3_cdq009,
      quest3Cdq010: payload.quest3_cdq010,
      quest7Diq010: payload.quest7_diq010,
      quest9Dlq050: payload.quest9_dlq050,
    },
  });

  if (!assessment) {
    throw createHttpError('Assessment ML pasien tidak ditemukan', NOT_FOUND);
  }

  return assessment;
}

module.exports = {
  getLatestPatientMlAssessment,
  listPatientMlAssessments,
  createPatientMlAssessment,
  updatePatientMlAssessment,
};
