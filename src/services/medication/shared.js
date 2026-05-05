const { BAD_REQUEST, NOT_FOUND, CONFLICT } = require('../../constants/httpStatus');
const { createHttpError } = require('../../utils/httpError');
const { normalizeConditionTag } = require('../../constants/enums');
const { assertPatientScope: assertPatientScopeGuard } = require('../shared/guards');

function normalizeNullableText(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function toPrismaTime(timeValue) {
  const [hours, minutes] = String(timeValue).split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

function formatTimeValue(timeValue) {
  if (!timeValue) {
    return null;
  }

  const date = new Date(timeValue);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function toNullableNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return Number(value);
}

function uniqueSortedStrings(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueSortedNumbers(values) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function extractIntakeTimes(reminders) {
  return uniqueSortedStrings(
    (reminders || []).map((reminder) => formatTimeValue(reminder.scheduleTime)).filter(Boolean)
  );
}

function extractDaysOfWeek(reminders) {
  const days = (reminders || [])
    .map((reminder) => reminder.dayOfWeek)
    .filter((day) => day !== undefined && day !== null);

  return uniqueSortedNumbers(days);
}

function buildReminderEntries({ frequency, intakeTimes, daysOfWeek }) {
  if (frequency === 'daily') {
    return intakeTimes.map((time) => ({
      scheduleTime: toPrismaTime(time),
      dayOfWeek: null,
    }));
  }

  const entries = [];
  for (const dayOfWeek of daysOfWeek) {
    for (const time of intakeTimes) {
      entries.push({
        scheduleTime: toPrismaTime(time),
        dayOfWeek,
      });
    }
  }

  return entries;
}

function validateMedicationScheduleState({ frequency, intakeTimes, numOfDays, daysOfWeek }) {
  if (!frequency) {
    throw createHttpError('frequency medication wajib diisi', BAD_REQUEST);
  }

  if (!Array.isArray(intakeTimes) || intakeTimes.length === 0) {
    throw createHttpError('Minimal satu intakeTimes wajib diisi', BAD_REQUEST);
  }

  if (frequency === 'daily') {
    if (!Number.isInteger(numOfDays) || numOfDays < 1 || numOfDays > 10) {
      throw createHttpError(
        'Medication daily wajib memakai numOfDays antara 1 sampai 10',
        BAD_REQUEST
      );
    }

    if (daysOfWeek && daysOfWeek.length > 0) {
      throw createHttpError('Medication daily tidak boleh memakai daysOfWeek', BAD_REQUEST);
    }

    return {
      frequency,
      numOfDays,
      daysOfWeek: [],
      intakeTimes: uniqueSortedStrings(intakeTimes),
    };
  }

  if (frequency === 'weekly') {
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      throw createHttpError('Medication weekly wajib memakai minimal satu daysOfWeek', BAD_REQUEST);
    }

    if (numOfDays !== undefined && numOfDays !== null) {
      throw createHttpError('Medication weekly tidak memakai numOfDays', BAD_REQUEST);
    }

    return {
      frequency,
      numOfDays: null,
      daysOfWeek: uniqueSortedNumbers(daysOfWeek),
      intakeTimes: uniqueSortedStrings(intakeTimes),
    };
  }

  throw createHttpError('frequency medication tidak valid', BAD_REQUEST);
}

function hasMedicationSchedulePayload(payload) {
  return (
    payload.frequency !== undefined ||
    payload.intakeTimes !== undefined ||
    payload.daysOfWeek !== undefined ||
    payload.numOfDays !== undefined
  );
}

function resolveMedicationScheduleStateForUpdate({ payload, currentMedication }) {
  const nextFrequency =
    payload.frequency !== undefined ? payload.frequency : currentMedication.frequency;
  const currentIntakeTimes = extractIntakeTimes(currentMedication.reminders);
  const currentDaysOfWeek =
    currentMedication.frequency === 'weekly'
      ? extractDaysOfWeek(currentMedication.reminders)
      : undefined;

  return {
    frequency: nextFrequency,
    intakeTimes: payload.intakeTimes !== undefined ? payload.intakeTimes : currentIntakeTimes,
    daysOfWeek:
      nextFrequency === 'weekly'
        ? payload.daysOfWeek !== undefined
          ? payload.daysOfWeek
          : currentDaysOfWeek
        : undefined,
    numOfDays:
      nextFrequency === 'daily'
        ? payload.numOfDays !== undefined
          ? payload.numOfDays
          : currentMedication.frequency === 'daily'
            ? currentMedication.numOfDays
            : undefined
        : undefined,
  };
}

function assertReminderCompatibleWithMedication(medication, dayOfWeek) {
  const normalizedDayOfWeek = dayOfWeek ?? null;

  if (medication.frequency === 'daily' && normalizedDayOfWeek !== null) {
    throw createHttpError('Reminder medication daily tidak boleh memakai dayOfWeek', BAD_REQUEST);
  }

  if (medication.frequency === 'weekly' && normalizedDayOfWeek === null) {
    throw createHttpError('Reminder medication weekly wajib memakai dayOfWeek', BAD_REQUEST);
  }
}

function toReminderDto(reminder) {
  return {
    reminderId: reminder.reminderId,
    userId: reminder.userId,
    medicationId: reminder.medicationId,
    scheduleTime: formatTimeValue(reminder.scheduleTime),
    dayOfWeek: reminder.dayOfWeek ?? null,
    createdAt: reminder.createdAt.toISOString(),
  };
}

function toDateOnlyValue(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function toPrismaDate(dateValue) {
  return new Date(`${dateValue}T00:00:00.000Z`);
}

function toMedicationLogDto(log) {
  return {
    medicationLogId: log.medicationLogId,
    userId: log.userId,
    medicationId: log.medicationId,
    status: log.status || 'taken',
    medicationDate: toDateOnlyValue(log.medicationDate),
    medicationTime: formatTimeValue(log.medicationTime),
    createdAt: log.createdAt.toISOString(),
  };
}

function toMedicationDto(medication) {
  if (!medication) {
    throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
  }

  return {
    medicationId: medication.medicationId,
    userId: medication.userId,
    name: medication.name,
    description: medication.description,
    conditionTag: medication.conditionTag,
    form: medication.form || null,
    color: medication.color || null,
    singleDose: toNullableNumber(medication.singleDose),
    singleDoseUnit: medication.singleDoseUnit || null,
    startDate: toDateOnlyValue(medication.startDate),
    frequency: medication.frequency,
    numOfDays: medication.numOfDays ?? null,
    daysOfWeek: medication.frequency === 'weekly' ? extractDaysOfWeek(medication.reminders) : [],
    intakeTimes: extractIntakeTimes(medication.reminders),
    note: medication.note || null,
    createdAt: medication.createdAt.toISOString(),
    reminders: (medication.reminders || []).map(toReminderDto),
  };
}

function toUtcDateOnly(dateValue) {
  return new Date(
    Date.UTC(
      dateValue.getUTCFullYear(),
      dateValue.getUTCMonth(),
      dateValue.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

function addUtcDays(dateValue, days) {
  return new Date(
    Date.UTC(
      dateValue.getUTCFullYear(),
      dateValue.getUTCMonth(),
      dateValue.getUTCDate() + days,
      0,
      0,
      0,
      0
    )
  );
}

function maxUtcDate(left, right) {
  return left.getTime() >= right.getTime() ? left : right;
}

function getMondayBasedDayOfWeek(dateValue) {
  const utcDay = dateValue.getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}

function buildMedicationLogLookup(logs) {
  const lookup = new Map();

  for (const log of logs) {
    const medicationDate = toDateOnlyValue(log.medicationDate);
    const medicationTime = formatTimeValue(log.medicationTime);

    if (!medicationDate || !medicationTime) {
      continue;
    }

    const key = `${log.medicationId}|${medicationDate}|${medicationTime}`;
    if (!lookup.has(key)) {
      lookup.set(key, log);
    }
  }

  return lookup;
}

function buildCalendarEvent({ medication, reminder, scheduledDate, matchedLog }) {
  return {
    eventId: `${reminder.reminderId}:${scheduledDate}`,
    scheduledDate,
    scheduledTime: formatTimeValue(reminder.scheduleTime),
    reminderId: reminder.reminderId,
    medicationId: medication.medicationId,
    medicationLogId: matchedLog?.medicationLogId || null,
    name: medication.name,
    color: medication.color || null,
    singleDose: toNullableNumber(medication.singleDose),
    singleDoseUnit: medication.singleDoseUnit || null,
    status: matchedLog?.status || null,
  };
}

function buildDailyCalendarEvents({ medication, reminder, rangeStart, rangeEnd, logLookup }) {
  const medicationStart = medication.startDate
    ? toUtcDateOnly(new Date(medication.startDate))
    : rangeStart;
  const effectiveStart = maxUtcDate(rangeStart, medicationStart);

  if (effectiveStart.getTime() > rangeEnd.getTime()) {
    return [];
  }

  const events = [];
  for (
    let currentDate = effectiveStart;
    currentDate.getTime() <= rangeEnd.getTime();
    currentDate = addUtcDays(currentDate, 1)
  ) {
    const scheduledDate = toDateOnlyValue(currentDate);
    const scheduledTime = formatTimeValue(reminder.scheduleTime);
    const matchedLog = logLookup.get(
      `${medication.medicationId}|${scheduledDate}|${scheduledTime}`
    );

    events.push(
      buildCalendarEvent({
        medication,
        reminder,
        scheduledDate,
        matchedLog,
      })
    );
  }

  return events;
}

function buildWeeklyCalendarEvents({ medication, reminder, rangeStart, rangeEnd, logLookup }) {
  if (reminder.dayOfWeek === undefined || reminder.dayOfWeek === null) {
    return [];
  }

  const medicationStart = medication.startDate
    ? toUtcDateOnly(new Date(medication.startDate))
    : rangeStart;
  const effectiveStart = maxUtcDate(rangeStart, medicationStart);
  const currentDay = getMondayBasedDayOfWeek(effectiveStart);
  const daysUntilMatch = (reminder.dayOfWeek - currentDay + 7) % 7;
  const firstOccurrence = addUtcDays(effectiveStart, daysUntilMatch);

  if (firstOccurrence.getTime() > rangeEnd.getTime()) {
    return [];
  }

  const events = [];
  for (
    let currentDate = firstOccurrence;
    currentDate.getTime() <= rangeEnd.getTime();
    currentDate = addUtcDays(currentDate, 7)
  ) {
    const scheduledDate = toDateOnlyValue(currentDate);
    const scheduledTime = formatTimeValue(reminder.scheduleTime);
    const matchedLog = logLookup.get(
      `${medication.medicationId}|${scheduledDate}|${scheduledTime}`
    );

    events.push(
      buildCalendarEvent({
        medication,
        reminder,
        scheduledDate,
        matchedLog,
      })
    );
  }

  return events;
}

function buildMedicationCalendarEvents({ medication, rangeStart, rangeEnd, logLookup }) {
  const reminders = medication.reminders || [];

  return reminders.flatMap((reminder) => {
    if (medication.frequency === 'weekly') {
      return buildWeeklyCalendarEvents({
        medication,
        reminder,
        rangeStart,
        rangeEnd,
        logLookup,
      });
    }

    return buildDailyCalendarEvents({
      medication,
      reminder,
      rangeStart,
      rangeEnd,
      logLookup,
    });
  });
}

function assertPatientScope({ actor, userId }) {
  return assertPatientScopeGuard({
    actor,
    patientId: userId,
    messages: {
      roleDenied: 'Role tidak memiliki akses fitur medication pasien',
      scopeDenied: 'Akses data medication pasien ditolak',
    },
  });
}

async function ensureMedicationOwnership(tx, { medicationId, userId }) {
  const medication = await tx.medication.findFirst({
    where: {
      medicationId,
      userId,
    },
  });

  if (!medication) {
    throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
  }

  return medication;
}

async function assertNoDuplicateReminderTime(
  tx,
  { userId, medicationId, scheduleTime, dayOfWeek, excludeReminderId }
) {
  const duplicated = await tx.reminder.findFirst({
    where: {
      userId,
      medicationId,
      scheduleTime,
      dayOfWeek: dayOfWeek ?? null,
      reminderId: excludeReminderId
        ? {
            not: excludeReminderId,
          }
        : undefined,
    },
  });

  if (duplicated) {
    throw createHttpError('Reminder pada jam tersebut sudah ada', CONFLICT);
  }
}

module.exports = {
  normalizeConditionTag,
  normalizeNullableText,
  toPrismaTime,
  formatTimeValue,
  toNullableNumber,
  extractIntakeTimes,
  extractDaysOfWeek,
  buildReminderEntries,
  validateMedicationScheduleState,
  hasMedicationSchedulePayload,
  resolveMedicationScheduleStateForUpdate,
  assertReminderCompatibleWithMedication,
  toReminderDto,
  toDateOnlyValue,
  toPrismaDate,
  toMedicationLogDto,
  toMedicationDto,
  buildMedicationLogLookup,
  buildMedicationCalendarEvents,
  assertPatientScope,
  ensureMedicationOwnership,
  assertNoDuplicateReminderTime,
};
