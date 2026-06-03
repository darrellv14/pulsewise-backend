const patientHeartRiskRepository = require('../../repositories/patientHeartRiskRepository');
const {
  assertPatientScope,
  assertDoctorDashboardRouteAccess,
  ensureAssessmentExists,
} = require('./shared');

function toRepositoryPayload(payload) {
  return {
    assessmentDate: payload.assessmentDate,
    age: payload.age,
    sex: payload.sex,
    chestPainType: payload.chest_pain_type,
    restingBpS: payload.resting_bp_s,
    fastingBloodSugar: payload.fasting_blood_sugar,
    maxHeartRate: payload.max_heart_rate,
    exerciseAngina: payload.exercise_angina,
    oldPeak: payload.old_peak,
    stSlope: payload.st_slope,
  };
}

async function getLatestPatientHeartRiskAssessment({ actor, userId }) {
  await assertPatientScope({ actor, patientId: userId });
  const assessment = await patientHeartRiskRepository.getLatestPatientHeartRiskAssessment(userId);
  return ensureAssessmentExists(assessment);
}

async function getPatientHeartRiskAssessmentDetail({ actor, userId, assessmentId }) {
  await assertPatientScope({ actor, patientId: userId });
  const assessment = await patientHeartRiskRepository.getPatientHeartRiskAssessmentById({
    patientId: userId,
    assessmentId,
  });
  return ensureAssessmentExists(assessment);
}

async function listPatientHeartRiskAssessments({ actor, userId, query }) {
  await assertPatientScope({ actor, patientId: userId });
  const items = await patientHeartRiskRepository.listPatientHeartRiskAssessments({
    patientId: userId,
    startDate: query.startDate,
    endDate: query.endDate,
  });
  return { items };
}

async function createPatientHeartRiskAssessment({ actor, userId, payload }) {
  await assertPatientScope({ actor, patientId: userId });
  return patientHeartRiskRepository.createPatientHeartRiskAssessment({
    patientId: userId,
    actorUserId: actor.userId,
    payload: toRepositoryPayload(payload),
  });
}

async function updatePatientHeartRiskAssessment({ actor, userId, assessmentId, payload }) {
  await assertPatientScope({ actor, patientId: userId });
  const assessment = await patientHeartRiskRepository.updatePatientHeartRiskAssessment({
    patientId: userId,
    assessmentId,
    actorUserId: actor.userId,
    payload: toRepositoryPayload(payload),
  });

  return ensureAssessmentExists(assessment);
}

async function createDoctorDashboardPatientHeartRiskAssessment({
  actor,
  doctorId,
  patientId,
  payload,
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  return patientHeartRiskRepository.createPatientHeartRiskAssessment({
    patientId,
    actorUserId: actor.userId,
    payload: toRepositoryPayload(payload),
  });
}

async function updateDoctorDashboardPatientHeartRiskAssessment({
  actor,
  doctorId,
  patientId,
  assessmentId,
  payload,
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const assessment = await patientHeartRiskRepository.updatePatientHeartRiskAssessment({
    patientId,
    assessmentId,
    actorUserId: actor.userId,
    payload: toRepositoryPayload(payload),
  });

  return ensureAssessmentExists(assessment);
}

async function getDoctorDashboardPatientLatestHeartRiskAssessment({ actor, doctorId, patientId }) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const assessment = await patientHeartRiskRepository.getLatestPatientHeartRiskAssessment(patientId);
  return ensureAssessmentExists(assessment);
}

async function getDoctorDashboardPatientHeartRiskAssessmentDetail({
  actor,
  doctorId,
  patientId,
  assessmentId,
}) {
  await assertDoctorDashboardRouteAccess({ actor, doctorId, patientId });
  const assessment = await patientHeartRiskRepository.getPatientHeartRiskAssessmentById({
    patientId,
    assessmentId,
  });
  return ensureAssessmentExists(assessment);
}

module.exports = {
  getLatestPatientHeartRiskAssessment,
  getPatientHeartRiskAssessmentDetail,
  listPatientHeartRiskAssessments,
  createPatientHeartRiskAssessment,
  updatePatientHeartRiskAssessment,
  createDoctorDashboardPatientHeartRiskAssessment,
  updateDoctorDashboardPatientHeartRiskAssessment,
  getDoctorDashboardPatientLatestHeartRiskAssessment,
  getDoctorDashboardPatientHeartRiskAssessmentDetail,
};
