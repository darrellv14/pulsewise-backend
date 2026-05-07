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

async function getPatientLatestMlPrediction(req, res, next) {
  try {
    const data = await mlRecommendationService.getPatientLatestMlPrediction({
      actor: req.user,
      userId: req.params.userId,
    });

    return success(res, 'Prediksi ML terbaru pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientLatestMlRecommendation(req, res, next) {
  try {
    const data = await mlRecommendationService.getPatientLatestMlRecommendation({
      actor: req.user,
      userId: req.params.userId,
    });

    return success(res, 'Rekomendasi ML terbaru pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listPatientMlPredictionHistory(req, res, next) {
  try {
    const data = await mlRecommendationService.listPatientMlPredictionHistory({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Riwayat prediksi ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listPatientMlRecommendationHistory(req, res, next) {
  try {
    const data = await mlRecommendationService.listPatientMlRecommendationHistory({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Riwayat rekomendasi ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientMlPredictionHistoryDetail(req, res, next) {
  try {
    const data = await mlRecommendationService.getPatientMlPredictionHistoryDetail({
      actor: req.user,
      userId: req.params.userId,
      resultId: req.params.resultId,
    });

    return success(res, 'Detail riwayat prediksi ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientMlRecommendationHistoryDetail(req, res, next) {
  try {
    const data = await mlRecommendationService.getPatientMlRecommendationHistoryDetail({
      actor: req.user,
      userId: req.params.userId,
      resultId: req.params.resultId,
    });

    return success(res, 'Detail riwayat rekomendasi ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientLatestMlPrediction(req, res, next) {
  try {
    const data = await mlRecommendationService.getDoctorDashboardPatientLatestMlPrediction({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
    });

    return success(res, 'Prediksi ML terbaru pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientLatestMlRecommendation(req, res, next) {
  try {
    const data = await mlRecommendationService.getDoctorDashboardPatientLatestMlRecommendation({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
    });

    return success(res, 'Rekomendasi ML terbaru pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listDoctorDashboardPatientMlPredictionHistory(req, res, next) {
  try {
    const data = await mlRecommendationService.listDoctorDashboardPatientMlPredictionHistory({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      query: req.query,
    });

    return success(res, 'Riwayat prediksi ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listDoctorDashboardPatientMlRecommendationHistory(req, res, next) {
  try {
    const data = await mlRecommendationService.listDoctorDashboardPatientMlRecommendationHistory({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      query: req.query,
    });

    return success(res, 'Riwayat rekomendasi ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientMlPredictionHistoryDetail(req, res, next) {
  try {
    const data = await mlRecommendationService.getDoctorDashboardPatientMlPredictionHistoryDetail({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      resultId: req.params.resultId,
    });

    return success(res, 'Detail riwayat prediksi ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientMlRecommendationHistoryDetail(req, res, next) {
  try {
    const data =
      await mlRecommendationService.getDoctorDashboardPatientMlRecommendationHistoryDetail({
        actor: req.user,
        doctorId: req.params.doctorId,
        patientId: req.params.patientId,
        resultId: req.params.resultId,
      });

    return success(res, 'Detail riwayat rekomendasi ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPatientMlReadiness,
  getPatientMlPayload,
  getPatientMlPredictions,
  getPatientMlRecommendations,
  getPatientLatestMlPrediction,
  getPatientLatestMlRecommendation,
  listPatientMlPredictionHistory,
  listPatientMlRecommendationHistory,
  getPatientMlPredictionHistoryDetail,
  getPatientMlRecommendationHistoryDetail,
  getDoctorDashboardPatientMlReadiness,
  getDoctorDashboardPatientMlPayload,
  getDoctorDashboardPatientMlPredictions,
  getDoctorDashboardPatientMlRecommendations,
  getDoctorDashboardPatientLatestMlPrediction,
  getDoctorDashboardPatientLatestMlRecommendation,
  listDoctorDashboardPatientMlPredictionHistory,
  listDoctorDashboardPatientMlRecommendationHistory,
  getDoctorDashboardPatientMlPredictionHistoryDetail,
  getDoctorDashboardPatientMlRecommendationHistoryDetail,
};
