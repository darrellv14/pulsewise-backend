const { CREATED } = require('../constants/httpStatus');
const env = require('../config/env');
const { success } = require('../utils/response');
const legacyParityService = require('../services/legacyParityService');

async function listEmergencyContacts(req, res, next) {
  try {
    const data = await legacyParityService.listEmergencyContacts({
      actor: req.user,
      userId: req.params.userId,
    });

    return success(res, 'Daftar emergency contact berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createEmergencyContact(req, res, next) {
  try {
    const data = await legacyParityService.createEmergencyContact({
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
    const data = await legacyParityService.updateEmergencyContact({
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
    const data = await legacyParityService.deleteEmergencyContact({
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
    const data = await legacyParityService.upsertHeartDiary({
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
    const data = await legacyParityService.listHeartDiaries({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Daftar heart diary berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getHeartDiaryDetail(req, res, next) {
  try {
    const data = await legacyParityService.getHeartDiaryDetail({
      actor: req.user,
      userId: req.params.userId,
      diaryId: req.params.diaryId,
    });

    return success(res, 'Detail heart diary berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createDailyBodyMetric(req, res, next) {
  try {
    const data = await legacyParityService.createDailyBodyMetric({
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

async function createDailySymptom(req, res, next) {
  try {
    const data = await legacyParityService.createDailySymptom({
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

async function createDailyActivity(req, res, next) {
  try {
    const data = await legacyParityService.createDailyActivity({
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

async function createDailyConsumption(req, res, next) {
  try {
    const data = await legacyParityService.createDailyConsumption({
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

async function createAvatarUploadSignature(req, res, next) {
  try {
    const data = await legacyParityService.createAvatarUploadSignature({
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
    const data = await legacyParityService.saveAvatarUploadResult({
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
  getHeartDiaryDetail,
  createDailyBodyMetric,
  createDailySymptom,
  createDailyActivity,
  createDailyConsumption,
  createAvatarUploadSignature,
  saveAvatarUploadResult,
};
