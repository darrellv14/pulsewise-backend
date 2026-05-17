const {
  listMedications,
  listMedicationCalendar,
  getMedicationById,
} = require('./medication/queryService');
const {
  createMedication,
  updateMedication,
  deleteMedication,
} = require('./medication/mutationService');
const {
  listRemindersByMedication,
  createReminder,
  updateReminder,
  deleteReminder,
} = require('./medication/reminderService');
const { listMedicationLogs, createMedicationLog } = require('./medication/logService');
const {
  sendMedicationReminderNotification,
  sendMedicationReminderNotificationInternal,
} = require('./medication/reminderNotificationService');
const {
  processMedicationReminderWindow,
  startMedicationReminderScheduler,
  stopMedicationReminderScheduler,
} = require('./medication/reminderSchedulerService');

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
  sendMedicationReminderNotificationInternal,
  processMedicationReminderWindow,
  startMedicationReminderScheduler,
  stopMedicationReminderScheduler,
};
