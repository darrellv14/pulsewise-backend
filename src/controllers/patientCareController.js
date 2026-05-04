const { CREATED } = require('../constants/httpStatus');
const env = require('../config/env');
const { success } = require('../utils/response');
const patientCareService = require('../services/patientCareService');

async function listEmergencyContacts(req, res, next) {
  try {
    const data = await patientCareService.listEmergencyContacts({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Daftar emergency contact berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createEmergencyContact(req, res, next) {
  try {
    const data = await patientCareService.createEmergencyContact({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'Emergency contact berhasil dibuat', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function updateEmergencyContact(req, res, next) {
  try {
    const data = await patientCareService.updateEmergencyContact({
      actor: req.user,
      userId: req.params.userId,
      emergencyContactId: req.params.emergencyContactId,
      payload: req.body,
    });

    return success(res, 'Emergency contact berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function deleteEmergencyContact(req, res, next) {
  try {
    const data = await patientCareService.deleteEmergencyContact({
      actor: req.user,
      userId: req.params.userId,
      emergencyContactId: req.params.emergencyContactId,
    });

    return success(res, 'Emergency contact berhasil dihapus', data);
  } catch (error) {
    return next(error);
  }
}

async function upsertHeartDiary(req, res, next) {
  try {
    const data = await patientCareService.upsertHeartDiary({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'Heart diary berhasil disimpan', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function listHeartDiaries(req, res, next) {
  try {
    const data = await patientCareService.listHeartDiaries({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Daftar heart diary berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getHeartDiaryByDate(req, res, next) {
  try {
    const data = await patientCareService.getHeartDiaryByDate({
      actor: req.user,
      userId: req.params.userId,
      diaryDate: req.query.date,
    });

    return success(res, 'Detail heart diary berdasarkan tanggal berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDailySleepRecordByDate(req, res, next) {
  try {
    const data = await patientCareService.getDailySleepRecordByDate({
      actor: req.user,
      userId: req.params.userId,
      diaryDate: req.query.date,
    });

    return success(res, 'Sleep diary berdasarkan tanggal berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function upsertDailySleepRecordByDate(req, res, next) {
  try {
    const data = await patientCareService.upsertDailySleepRecordByDate({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'Sleep diary berdasarkan tanggal berhasil disimpan', data);
  } catch (error) {
    return next(error);
  }
}

async function createDailyBodyMetric(req, res, next) {
  try {
    const data = await patientCareService.createDailyBodyMetric({
      actor: req.user,
      userId: req.params.userId,
      diaryId: req.params.diaryId,
      payload: req.body,
    });

    return success(res, 'Body metric diary berhasil ditambahkan', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function createDailyBodyMetricByDate(req, res, next) {
  try {
    const data = await patientCareService.createDailyBodyMetricByDate({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'Body metric diary berdasarkan tanggal berhasil disimpan', data);
  } catch (error) {
    return next(error);
  }
}

async function createDailySymptom(req, res, next) {
  try {
    const data = await patientCareService.createDailySymptom({
      actor: req.user,
      userId: req.params.userId,
      diaryId: req.params.diaryId,
      payload: req.body,
    });

    return success(res, 'Symptom diary berhasil ditambahkan', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function createDailySymptomByDate(req, res, next) {
  try {
    const data = await patientCareService.createDailySymptomByDate({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'Symptom diary berdasarkan tanggal berhasil ditambahkan', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function createDailyActivity(req, res, next) {
  try {
    const data = await patientCareService.createDailyActivity({
      actor: req.user,
      userId: req.params.userId,
      diaryId: req.params.diaryId,
      payload: req.body,
    });

    return success(res, 'Activity diary berhasil ditambahkan', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function createDailyActivityByDate(req, res, next) {
  try {
    const data = await patientCareService.createDailyActivityByDate({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'Activity diary berdasarkan tanggal berhasil ditambahkan', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function createDailyConsumption(req, res, next) {
  try {
    const data = await patientCareService.createDailyConsumption({
      actor: req.user,
      userId: req.params.userId,
      diaryId: req.params.diaryId,
      payload: req.body,
    });

    return success(res, 'Consumption diary berhasil ditambahkan', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function createDailyConsumptionByDate(req, res, next) {
  try {
    const data = await patientCareService.createDailyConsumptionByDate({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(
      res,
      'Consumption diary berdasarkan tanggal berhasil ditambahkan',
      data,
      CREATED
    );
  } catch (error) {
    return next(error);
  }
}

async function createAvatarUploadSignature(req, res, next) {
  try {
    const data = await patientCareService.createAvatarUploadSignature({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
      envConfig: env,
    });

    return success(res, 'Signature upload avatar berhasil dibuat', data);
  } catch (error) {
    return next(error);
  }
}

async function saveAvatarUploadResult(req, res, next) {
  try {
    const data = await patientCareService.saveAvatarUploadResult({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'Avatar profile berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  upsertHeartDiary,
  listHeartDiaries,
  getHeartDiaryByDate,
  getDailySleepRecordByDate,
  upsertDailySleepRecordByDate,
  createDailyBodyMetric,
  createDailyBodyMetricByDate,
  createDailySymptom,
  createDailySymptomByDate,
  createDailyActivity,
  createDailyActivityByDate,
  createDailyConsumption,
  createDailyConsumptionByDate,
  createAvatarUploadSignature,
  saveAvatarUploadResult,
};
