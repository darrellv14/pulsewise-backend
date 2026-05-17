const { createHttpError } = require('../../utils/httpError');
const { BAD_REQUEST, NOT_FOUND } = require('../../constants/httpStatus');
const notificationService = require('../notificationService');
const { loadMedicationWithReminders } = require('./persistenceService');
const {
  assertPatientScope,
  formatTimeValue,
  toNullableNumber,
} = require('./shared');
const prisma = require('../../config/prisma');

function buildMedicationReminderSummary({
  medicationId,
  status,
  scheduledDate,
  scheduledTime,
}) {
  return `Item ID: ${medicationId}, Status: ${status}, Scheduled Date: ${scheduledDate}, Scheduled Time: ${scheduledTime}`;
}

function buildMedicationReminderDedupeKey({
  userId,
  medicationId,
  reminderId,
  scheduledDate,
  scheduledTime,
}) {
  return [
    'medication_reminder',
    userId,
    medicationId,
    reminderId,
    scheduledDate,
    scheduledTime,
  ].join(':');
}

function resolveReminderForNotification(medication, { reminderId, scheduledTime }) {
  const reminders = medication.reminders || [];

  if (reminderId) {
    const matchedById = reminders.find((reminder) => reminder.reminderId === reminderId);
    if (!matchedById) {
      throw createHttpError('Reminder tidak ditemukan pada medication ini', NOT_FOUND);
    }

    return matchedById;
  }

  if (scheduledTime) {
    const matchedByTime = reminders.find(
      (reminder) => formatTimeValue(reminder.scheduleTime) === scheduledTime
    );
    if (!matchedByTime) {
      throw createHttpError('Reminder dengan scheduleTime tersebut tidak ditemukan', NOT_FOUND);
    }

    return matchedByTime;
  }

  if (reminders.length === 1) {
    return reminders[0];
  }

  throw createHttpError(
    'Gunakan reminderId atau scheduledTime untuk memilih reminder yang akan dikirim',
    BAD_REQUEST
  );
}

function buildMedicationReminderNotificationPayload({ medication, reminder, payload }) {
  const scheduledTime = payload.scheduledTime || formatTimeValue(reminder.scheduleTime);
  const status = payload.status || 'Open';
  const title = payload.title || 'Waktunya minum obat';
  const baseBody = `${medication.name} dijadwalkan pukul ${scheduledTime}`;
  const body = payload.body || baseBody;
  const summary = buildMedicationReminderSummary({
    medicationId: medication.medicationId,
    status,
    scheduledDate: payload.scheduledDate,
    scheduledTime,
  });

  return {
    title,
    body,
    data: {
      action: 'open_medication_reminder',
      type: 'medication_reminder',
      medicationId: medication.medicationId,
      reminderId: reminder.reminderId,
      status,
      scheduledDate: payload.scheduledDate,
      scheduledTime,
      summary,
      source: 'pulsewise-medication-reminder',
      medicationName: medication.name,
      singleDose:
        medication.singleDose !== null && medication.singleDose !== undefined
          ? String(toNullableNumber(medication.singleDose))
          : '',
      singleDoseUnit: medication.singleDoseUnit || '',
      color: medication.color || '',
    },
  };
}

async function sendMedicationReminderNotification({ actor, userId, medicationId, payload }) {
  assertPatientScope({ actor, userId });

  const medication = await loadMedicationWithReminders(prisma, { userId, medicationId });
  if (!medication) {
    throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
  }

  const reminder = resolveReminderForNotification(medication, {
    reminderId: payload.reminderId,
    scheduledTime: payload.scheduledTime,
  });
  const notificationPayload = buildMedicationReminderNotificationPayload({
    medication,
    reminder,
    payload,
  });
  const dedupeKey = buildMedicationReminderDedupeKey({
    userId,
    medicationId: medication.medicationId,
    reminderId: reminder.reminderId,
    scheduledDate: notificationPayload.data.scheduledDate,
    scheduledTime: notificationPayload.data.scheduledTime,
  });

  return notificationService.deliverNotificationToUser({
    actor,
    userId,
    title: notificationPayload.title,
    body: notificationPayload.body,
    data: notificationPayload.data,
    notificationType: 'medication_reminder',
    dedupeKey,
  });
}

async function sendMedicationReminderNotificationInternal({
  userId,
  medication,
  reminder,
  payload,
  dedupeKey,
}) {
  const notificationPayload = buildMedicationReminderNotificationPayload({
    medication,
    reminder,
    payload,
  });

  return notificationService.deliverNotificationToUser({
    userId,
    title: notificationPayload.title,
    body: notificationPayload.body,
    data: notificationPayload.data,
    notificationType: 'medication_reminder',
    dedupeKey:
      dedupeKey ||
      buildMedicationReminderDedupeKey({
        userId,
        medicationId: medication.medicationId,
        reminderId: reminder.reminderId,
        scheduledDate: notificationPayload.data.scheduledDate,
        scheduledTime: notificationPayload.data.scheduledTime,
      }),
  });
}

module.exports = {
  buildMedicationReminderDedupeKey,
  buildMedicationReminderNotificationPayload,
  sendMedicationReminderNotificationInternal,
  sendMedicationReminderNotification,
};
