const { CREATED } = require('../constants/httpStatus');
const { success } = require('../utils/response');
const medicationService = require('../services/medicationService');

async function listMedications(req, res, next) {
  try {
    const data = await medicationService.listMedications({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Daftar medication berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listMedicationCalendar(req, res, next) {
  try {
    const data = await medicationService.listMedicationCalendar({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Kalender medication berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getMedicationById(req, res, next) {
  try {
    const data = await medicationService.getMedicationById({
      actor: req.user,
      userId: req.params.userId,
      medicationId: req.params.medicationId,
    });

    return success(res, 'Detail medication berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createMedication(req, res, next) {
  try {
    const data = await medicationService.createMedication({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'Medication berhasil dibuat', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function updateMedication(req, res, next) {
  try {
    const data = await medicationService.updateMedication({
      actor: req.user,
      userId: req.params.userId,
      medicationId: req.params.medicationId,
      payload: req.body,
    });

    return success(res, 'Medication berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function deleteMedication(req, res, next) {
  try {
    const data = await medicationService.deleteMedication({
      actor: req.user,
      userId: req.params.userId,
      medicationId: req.params.medicationId,
    });

    return success(res, 'Medication berhasil dihapus', data);
  } catch (error) {
    return next(error);
  }
}

async function listRemindersByMedication(req, res, next) {
  try {
    const data = await medicationService.listRemindersByMedication({
      actor: req.user,
      userId: req.params.userId,
      medicationId: req.params.medicationId,
      query: req.query,
    });

    return success(res, 'Daftar reminder berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createReminder(req, res, next) {
  try {
    const data = await medicationService.createReminder({
      actor: req.user,
      userId: req.params.userId,
      medicationId: req.params.medicationId,
      payload: req.body,
    });

    return success(res, 'Reminder berhasil dibuat', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function updateReminder(req, res, next) {
  try {
    const data = await medicationService.updateReminder({
      actor: req.user,
      userId: req.params.userId,
      reminderId: req.params.reminderId,
      payload: req.body,
    });

    return success(res, 'Reminder berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function deleteReminder(req, res, next) {
  try {
    const data = await medicationService.deleteReminder({
      actor: req.user,
      userId: req.params.userId,
      reminderId: req.params.reminderId,
    });

    return success(res, 'Reminder berhasil dihapus', data);
  } catch (error) {
    return next(error);
  }
}

async function listMedicationLogs(req, res, next) {
  try {
    const data = await medicationService.listMedicationLogs({
      actor: req.user,
      userId: req.params.userId,
      medicationId: req.params.medicationId,
      query: req.query,
    });

    return success(res, 'Daftar medication log berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createMedicationLog(req, res, next) {
  try {
    const data = await medicationService.createMedicationLog({
      actor: req.user,
      userId: req.params.userId,
      medicationId: req.params.medicationId,
      payload: req.body,
    });

    return success(res, 'Medication log berhasil dibuat', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function sendMedicationReminderNotification(req, res, next) {
  try {
    const data = await medicationService.sendMedicationReminderNotification({
      actor: req.user,
      userId: req.params.userId,
      medicationId: req.params.medicationId,
      payload: req.body,
    });

    return success(res, 'Medication reminder notification berhasil dikirim', data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listMedications,
  listMedicationCalendar,
  getMedicationById,
  createMedication,
  updateMedication,
  deleteMedication,
  listRemindersByMedication,
  createReminder,
  updateReminder,
  deleteReminder,
  listMedicationLogs,
  createMedicationLog,
  sendMedicationReminderNotification,
};
