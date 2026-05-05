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
};
