const { success } = require('../utils/response');
const heartRiskModelService = require('../services/heartRiskModelService');

async function getPatientHeartRiskReadiness(req, res, next) {
  try {
    const data = await heartRiskModelService.getPatientHeartRiskReadiness({
      actor: req.user,
      userId: req.params.userId,
    });
    return success(res, 'Status readiness second ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientLatestHeartRiskAssessment(req, res, next) {
  try {
    const data = await heartRiskModelService.getLatestPatientHeartRiskAssessment({
      actor: req.user,
      userId: req.params.userId,
    });
    return success(res, 'Assessment second ML terbaru pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listPatientHeartRiskAssessments(req, res, next) {
  try {
    const data = await heartRiskModelService.listPatientHeartRiskAssessments({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });
    return success(res, 'Daftar assessment second ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createPatientHeartRiskAssessment(req, res, next) {
  try {
    const data = await heartRiskModelService.createPatientHeartRiskAssessment({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });
    return success(res, 'Assessment second ML pasien berhasil disimpan', data);
  } catch (error) {
    return next(error);
  }
}

async function updatePatientHeartRiskAssessment(req, res, next) {
  try {
    const data = await heartRiskModelService.updatePatientHeartRiskAssessment({
      actor: req.user,
      userId: req.params.userId,
      assessmentId: req.params.assessmentId,
      payload: req.body,
    });
    return success(res, 'Assessment second ML pasien berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientHeartRiskPredictions(req, res, next) {
  try {
    const data = await heartRiskModelService.getPatientHeartRiskPredictions({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });
    return success(res, 'Prediksi second ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientLatestHeartRiskPrediction(req, res, next) {
  try {
    const data = await heartRiskModelService.getPatientLatestHeartRiskPrediction({
      actor: req.user,
      userId: req.params.userId,
    });
    return success(res, 'Prediksi second ML terbaru pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listPatientHeartRiskPredictionHistory(req, res, next) {
  try {
    const data = await heartRiskModelService.listPatientHeartRiskPredictionHistory({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });
    return success(res, 'Riwayat prediksi second ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientHeartRiskPredictionHistoryDetail(req, res, next) {
  try {
    const data = await heartRiskModelService.getPatientHeartRiskPredictionHistoryDetail({
      actor: req.user,
      userId: req.params.userId,
      resultId: req.params.resultId,
    });
    return success(res, 'Detail riwayat prediksi second ML pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientHeartRiskReadiness(req, res, next) {
  try {
    const data = await heartRiskModelService.getDoctorDashboardPatientHeartRiskReadiness({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
    });
    return success(res, 'Status readiness second ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientLatestHeartRiskAssessment(req, res, next) {
  try {
    const data = await heartRiskModelService.getDoctorDashboardPatientLatestHeartRiskAssessment({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
    });
    return success(res, 'Assessment second ML terbaru pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createDoctorDashboardPatientHeartRiskAssessment(req, res, next) {
  try {
    const data = await heartRiskModelService.createDoctorDashboardPatientHeartRiskAssessment({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      payload: req.body,
    });
    return success(res, 'Assessment second ML pasien dashboard berhasil disimpan', data);
  } catch (error) {
    return next(error);
  }
}

async function updateDoctorDashboardPatientHeartRiskAssessment(req, res, next) {
  try {
    const data = await heartRiskModelService.updateDoctorDashboardPatientHeartRiskAssessment({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      assessmentId: req.params.assessmentId,
      payload: req.body,
    });
    return success(res, 'Assessment second ML pasien dashboard berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientHeartRiskPredictions(req, res, next) {
  try {
    const data = await heartRiskModelService.getDoctorDashboardPatientHeartRiskPredictions({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      query: req.query,
    });
    return success(res, 'Prediksi second ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientLatestHeartRiskPrediction(req, res, next) {
  try {
    const data = await heartRiskModelService.getDoctorDashboardPatientLatestHeartRiskPrediction({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
    });
    return success(res, 'Prediksi second ML terbaru pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listDoctorDashboardPatientHeartRiskPredictionHistory(req, res, next) {
  try {
    const data =
      await heartRiskModelService.listDoctorDashboardPatientHeartRiskPredictionHistory({
        actor: req.user,
        doctorId: req.params.doctorId,
        patientId: req.params.patientId,
        query: req.query,
      });
    return success(res, 'Riwayat prediksi second ML pasien dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientHeartRiskPredictionHistoryDetail(req, res, next) {
  try {
    const data =
      await heartRiskModelService.getDoctorDashboardPatientHeartRiskPredictionHistoryDetail({
        actor: req.user,
        doctorId: req.params.doctorId,
        patientId: req.params.patientId,
        resultId: req.params.resultId,
      });
    return success(
      res,
      'Detail riwayat prediksi second ML pasien dashboard berhasil diambil',
      data
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPatientHeartRiskReadiness,
  getPatientLatestHeartRiskAssessment,
  listPatientHeartRiskAssessments,
  createPatientHeartRiskAssessment,
  updatePatientHeartRiskAssessment,
  getPatientHeartRiskPredictions,
  getPatientLatestHeartRiskPrediction,
  listPatientHeartRiskPredictionHistory,
  getPatientHeartRiskPredictionHistoryDetail,
  getDoctorDashboardPatientHeartRiskReadiness,
  getDoctorDashboardPatientLatestHeartRiskAssessment,
  createDoctorDashboardPatientHeartRiskAssessment,
  updateDoctorDashboardPatientHeartRiskAssessment,
  getDoctorDashboardPatientHeartRiskPredictions,
  getDoctorDashboardPatientLatestHeartRiskPrediction,
  listDoctorDashboardPatientHeartRiskPredictionHistory,
  getDoctorDashboardPatientHeartRiskPredictionHistoryDetail,
};
