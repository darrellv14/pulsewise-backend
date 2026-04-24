const { success } = require('../utils/response');
const mlRecommendationService = require('../services/mlRecommendationService');

async function getPatientMlReadiness(req, res, next) {
  try {
    const data = await mlRecommendationService.getPatientMlReadiness({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Status readiness ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientMlPayload(req, res, next) {
  try {
    const data = await mlRecommendationService.getPatientMlPayload({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Payload ML pasien berhasil dibentuk', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientMlPredictions(req, res, next) {
  try {
    const data = await mlRecommendationService.getPatientMlPredictions({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Prediksi dari microservice ML berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientMlRecommendations(req, res, next) {
  try {
    const data = await mlRecommendationService.getPatientMlRecommendations({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Rekomendasi dari microservice ML berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientMlReadiness(req, res, next) {
  try {
    const data = await mlRecommendationService.getDoctorDashboardPatientMlReadiness({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      query: req.query,
    });

    return success(res, 'Status readiness ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientMlPayload(req, res, next) {
  try {
    const data = await mlRecommendationService.getDoctorDashboardPatientMlPayload({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      query: req.query,
    });

    return success(res, 'Payload ML pasien dashboard berhasil dibentuk', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientMlPredictions(req, res, next) {
  try {
    const data = await mlRecommendationService.getDoctorDashboardPatientMlPredictions({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      query: req.query,
    });

    return success(res, 'Prediksi ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientMlRecommendations(req, res, next) {
  try {
    const data = await mlRecommendationService.getDoctorDashboardPatientMlRecommendations({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      query: req.query,
    });

    return success(res, 'Rekomendasi ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPatientMlReadiness,
  getPatientMlPayload,
  getPatientMlPredictions,
  getPatientMlRecommendations,
  getDoctorDashboardPatientMlReadiness,
  getDoctorDashboardPatientMlPayload,
  getDoctorDashboardPatientMlPredictions,
  getDoctorDashboardPatientMlRecommendations,
};
