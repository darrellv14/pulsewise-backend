const prisma = require('../config/prisma');
const { BAD_REQUEST, FORBIDDEN, NOT_FOUND, CONFLICT } = require('../constants/httpStatus');
const { buildPagination, normalizePaginationInput } = require('../utils/pagination');

const CACHE_TTL_SECONDS = 60;
const CACHE_SWR_SECONDS = 120;

function createHttpError(message, statusCode, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }

  return error;
}

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
      throw createHttpError('Medication daily wajib memakai numOfDays antara 1 sampai 10', BAD_REQUEST);
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

function sanitizeCacheTagPart(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .slice(0, 48);
}

function buildMedicationCacheTags({ userId, medicationId }) {
  const safeUserId = sanitizeCacheTagPart(userId);
  const tags = [`medications_user_${safeUserId}`];

  if (medicationId) {
    const safeMedicationId = sanitizeCacheTagPart(medicationId);
    tags.push(`medication_item_${safeMedicationId}`, `reminders_medication_${safeMedicationId}`);
  }

  return tags;
}

function buildCacheStrategy(tags) {
  if (!prisma.$accelerate) {
    return null;
  }

  return {
    ttl: CACHE_TTL_SECONDS,
    swr: CACHE_SWR_SECONDS,
    tags,
  };
}

function withOptionalCacheStrategy(queryArgs, tags) {
  const cacheStrategy = buildCacheStrategy(tags);
  if (!cacheStrategy) {
    return queryArgs;
  }

  return {
    ...queryArgs,
    cacheStrategy,
  };
}

async function invalidateCacheTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return;
  }

  await prisma.$accelerate?.invalidate({
    tags,
  });
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
    Date.UTC(dateValue.getUTCFullYear(), dateValue.getUTCMonth(), dateValue.getUTCDate(), 0, 0, 0, 0)
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

function minUtcDate(left, right) {
  return left.getTime() <= right.getTime() ? left : right;
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
  const medicationStart = medication.startDate ? toUtcDateOnly(new Date(medication.startDate)) : rangeStart;
  const effectiveStart = maxUtcDate(rangeStart, medicationStart);
  const medicationEnd = medication.numOfDays
    ? addUtcDays(medicationStart, medication.numOfDays - 1)
    : rangeEnd;
  const effectiveEnd = minUtcDate(rangeEnd, medicationEnd);

  if (effectiveStart.getTime() > effectiveEnd.getTime()) {
    return [];
  }

  const events = [];
  for (
    let currentDate = effectiveStart;
    currentDate.getTime() <= effectiveEnd.getTime();
    currentDate = addUtcDays(currentDate, 1)
  ) {
    const scheduledDate = toDateOnlyValue(currentDate);
    const scheduledTime = formatTimeValue(reminder.scheduleTime);
    const matchedLog = logLookup.get(`${medication.medicationId}|${scheduledDate}|${scheduledTime}`);

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

  const medicationStart = medication.startDate ? toUtcDateOnly(new Date(medication.startDate)) : rangeStart;
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
    const matchedLog = logLookup.get(`${medication.medicationId}|${scheduledDate}|${scheduledTime}`);

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
  if (!actor) {
    throw createHttpError('Aktor tidak valid', FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'patient') {
    throw createHttpError('Role tidak memiliki akses fitur medication pasien', FORBIDDEN);
  }

  if (actor.userId !== userId) {
    throw createHttpError('Akses data medication pasien ditolak', FORBIDDEN);
  }
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

async function listMedications({ actor, userId, query }) {
  assertPatientScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const skip = (page - 1) * limit;
  const cacheTags = buildMedicationCacheTags({ userId });

  const [medications, totalItems] = await Promise.all([
    prisma.medication.findMany(withOptionalCacheStrategy({
      where: {
        userId,
      },
      include: {
        reminders: {
          orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }, cacheTags)),
    prisma.medication.count(withOptionalCacheStrategy({
      where: {
        userId,
      },
    }, cacheTags)),
  ]);

  return {
    items: medications.map(toMedicationDto),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

async function listMedicationCalendar({ actor, userId, query }) {
  assertPatientScope({ actor, userId });

  const rangeStart = toPrismaDate(query.from);
  const rangeEnd = toPrismaDate(query.to);

  const medications = await prisma.medication.findMany({
    where: {
      userId,
      reminders: {
        some: {},
      },
      OR: [
        {
          startDate: null,
        },
        {
          startDate: {
            lte: rangeEnd,
          },
        },
      ],
    },
    include: {
      reminders: {
        orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
      },
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
  });

  if (medications.length === 0) {
    return {
      range: {
        from: query.from,
        to: query.to,
      },
      totalItems: 0,
      items: [],
    };
  }

  const medicationIds = medications.map((item) => item.medicationId);
  const logs = await prisma.medicationLog.findMany({
    where: {
      userId,
      medicationId: {
        in: medicationIds,
      },
      medicationDate: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    orderBy: [{ medicationDate: 'desc' }, { createdAt: 'desc' }],
  });

  const logLookup = buildMedicationLogLookup(logs);
  const items = medications
    .flatMap((medication) =>
      buildMedicationCalendarEvents({
        medication,
        rangeStart,
        rangeEnd,
        logLookup,
      })
    )
    .sort((left, right) => {
      if (left.scheduledDate !== right.scheduledDate) {
        return left.scheduledDate.localeCompare(right.scheduledDate);
      }

      if (left.scheduledTime !== right.scheduledTime) {
        return left.scheduledTime.localeCompare(right.scheduledTime);
      }

      return left.name.localeCompare(right.name);
    });

  return {
    range: {
      from: query.from,
      to: query.to,
    },
    totalItems: items.length,
    items,
  };
}

async function getMedicationById({ actor, userId, medicationId }) {
  assertPatientScope({ actor, userId });
  const cacheTags = buildMedicationCacheTags({ userId, medicationId });

  const medication = await prisma.medication.findFirst(withOptionalCacheStrategy({
    where: {
      medicationId,
      userId,
    },
    include: {
      reminders: {
        orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
      },
    },
  }, cacheTags));

  if (!medication) {
    throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
  }

  return toMedicationDto(medication);
}

async function createMedication({ actor, userId, payload }) {
  assertPatientScope({ actor, userId });

  const scheduleState = validateMedicationScheduleState({
    frequency: payload.frequency,
    intakeTimes: payload.intakeTimes,
    daysOfWeek: payload.daysOfWeek,
    numOfDays: payload.numOfDays,
  });
  const remindersPayload = buildReminderEntries(scheduleState);

  const medication = await prisma.$transaction(async (tx) => {
    const createdMedication = await tx.medication.create({
      data: {
        userId,
        name: payload.name.trim(),
        description: normalizeNullableText(payload.description),
        conditionTag: normalizeNullableText(payload.conditionTag),
        form: normalizeNullableText(payload.form),
        color: normalizeNullableText(payload.color),
        singleDose: payload.singleDose ?? null,
        singleDoseUnit: normalizeNullableText(payload.singleDoseUnit),
        startDate: toPrismaDate(payload.startDate),
        frequency: scheduleState.frequency,
        numOfDays: scheduleState.numOfDays,
        note: normalizeNullableText(payload.note),
      },
    });

    if (remindersPayload.length > 0) {
      await tx.reminder.createMany({
        data: remindersPayload.map((reminderPayload) => ({
          userId,
          medicationId: createdMedication.medicationId,
          scheduleTime: reminderPayload.scheduleTime,
          dayOfWeek: reminderPayload.dayOfWeek,
        })),
      });
    }

    return tx.medication.findUnique({
      where: {
        medicationId: createdMedication.medicationId,
      },
      include: {
        reminders: {
          orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
        },
      },
    });
  });

  await invalidateCacheTags(buildMedicationCacheTags({ userId }));

  return toMedicationDto(medication);
}

async function updateMedication({ actor, userId, medicationId, payload }) {
  assertPatientScope({ actor, userId });

  const medication = await prisma.$transaction(async (tx) => {
    const currentMedication = await tx.medication.findFirst({
      where: {
        medicationId,
        userId,
      },
      include: {
        reminders: {
          orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
        },
      },
    });

    if (!currentMedication) {
      throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
    }

    const medicationData = {};
    const scheduleTouched = hasMedicationSchedulePayload(payload);

    if (payload.name !== undefined) {
      medicationData.name = payload.name.trim();
    }

    if (payload.description !== undefined) {
      medicationData.description = normalizeNullableText(payload.description);
    }

    if (payload.conditionTag !== undefined) {
      medicationData.conditionTag = normalizeNullableText(payload.conditionTag);
    }

    if (payload.form !== undefined) {
      medicationData.form = normalizeNullableText(payload.form);
    }

    if (payload.color !== undefined) {
      medicationData.color = normalizeNullableText(payload.color);
    }

    if (payload.singleDose !== undefined) {
      medicationData.singleDose = payload.singleDose;
    }

    if (payload.singleDoseUnit !== undefined) {
      medicationData.singleDoseUnit = normalizeNullableText(payload.singleDoseUnit);
    }

    if (payload.startDate !== undefined) {
      medicationData.startDate = toPrismaDate(payload.startDate);
    }

    if (payload.note !== undefined) {
      medicationData.note = normalizeNullableText(payload.note);
    }

    if (scheduleTouched) {
      const nextScheduleState = validateMedicationScheduleState({
        frequency: payload.frequency !== undefined ? payload.frequency : currentMedication.frequency,
        intakeTimes:
          payload.intakeTimes !== undefined
            ? payload.intakeTimes
            : extractIntakeTimes(currentMedication.reminders),
        daysOfWeek:
          payload.daysOfWeek !== undefined
            ? payload.daysOfWeek
            : currentMedication.frequency === 'weekly'
              ? extractDaysOfWeek(currentMedication.reminders)
              : undefined,
        numOfDays:
          payload.numOfDays !== undefined ? payload.numOfDays : currentMedication.numOfDays,
      });

      medicationData.frequency = nextScheduleState.frequency;
      medicationData.numOfDays = nextScheduleState.numOfDays;

      await tx.reminder.deleteMany({
        where: {
          userId,
          medicationId,
        },
      });

      const reminderEntries = buildReminderEntries(nextScheduleState);
      if (reminderEntries.length > 0) {
        await tx.reminder.createMany({
          data: reminderEntries.map((entry) => ({
            userId,
            medicationId,
            scheduleTime: entry.scheduleTime,
            dayOfWeek: entry.dayOfWeek,
          })),
        });
      }
    }

    if (Object.keys(medicationData).length > 0) {
      await tx.medication.update({
        where: {
          medicationId,
        },
        data: medicationData,
      });
    }

    return tx.medication.findUnique({
      where: {
        medicationId,
      },
      include: {
        reminders: {
          orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
        },
      },
    });
  });

  await invalidateCacheTags(buildMedicationCacheTags({ userId, medicationId }));

  return toMedicationDto(medication);
}

async function deleteMedication({ actor, userId, medicationId }) {
  assertPatientScope({ actor, userId });

  await prisma.$transaction(async (tx) => {
    const result = await tx.medication.deleteMany({
      where: {
        medicationId,
        userId,
      },
    });

    if (result.count === 0) {
      throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
    }
  });

  await invalidateCacheTags(buildMedicationCacheTags({ userId, medicationId }));

  return {
    medicationId,
  };
}

async function listRemindersByMedication({ actor, userId, medicationId, query }) {
  assertPatientScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const skip = (page - 1) * limit;
  const cacheTags = buildMedicationCacheTags({ userId, medicationId });

  await ensureMedicationOwnership(prisma, { medicationId, userId });

  const where = {
    userId,
    medicationId,
  };

  const [reminders, totalItems] = await Promise.all([
    prisma.reminder.findMany(withOptionalCacheStrategy({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
      skip,
      take: limit,
    }, cacheTags)),
    prisma.reminder.count(withOptionalCacheStrategy({
      where,
    }, cacheTags)),
  ]);

  return {
    items: reminders.map(toReminderDto),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

async function createReminder({ actor, userId, medicationId, payload }) {
  assertPatientScope({ actor, userId });

  const reminder = await prisma.$transaction(async (tx) => {
    const medication = await ensureMedicationOwnership(tx, { medicationId, userId });
    const dayOfWeek = payload.dayOfWeek ?? null;

    assertReminderCompatibleWithMedication(medication, dayOfWeek);
    const scheduleTime = toPrismaTime(payload.scheduleTime);
    await assertNoDuplicateReminderTime(tx, {
      userId,
      medicationId,
      scheduleTime,
      dayOfWeek,
    });

    return tx.reminder.create({
      data: {
        userId,
        medicationId,
        scheduleTime,
        dayOfWeek,
      },
    });
  });

  await invalidateCacheTags(buildMedicationCacheTags({ userId, medicationId }));

  return toReminderDto(reminder);
}

async function updateReminder({ actor, userId, reminderId, payload }) {
  assertPatientScope({ actor, userId });

  let invalidationTags = null;
  const reminder = await prisma.$transaction(async (tx) => {
    const currentReminder = await tx.reminder.findFirst({
      where: {
        reminderId,
        userId,
      },
    });

    if (!currentReminder) {
      throw createHttpError('Reminder tidak ditemukan', NOT_FOUND);
    }

    invalidationTags = buildMedicationCacheTags({
      userId,
      medicationId: currentReminder.medicationId,
    });

    const medication = await ensureMedicationOwnership(tx, {
      medicationId: currentReminder.medicationId,
      userId,
    });
    const dayOfWeek = payload.dayOfWeek !== undefined ? payload.dayOfWeek : currentReminder.dayOfWeek;

    assertReminderCompatibleWithMedication(medication, dayOfWeek);
    const scheduleTime = toPrismaTime(payload.scheduleTime);
    await assertNoDuplicateReminderTime(tx, {
      userId,
      medicationId: currentReminder.medicationId,
      scheduleTime,
      dayOfWeek,
      excludeReminderId: reminderId,
    });

    return tx.reminder.update({
      where: {
        reminderId,
      },
      data: {
        scheduleTime,
        dayOfWeek,
      },
    });
  });

  await invalidateCacheTags(invalidationTags);

  return toReminderDto(reminder);
}

async function deleteReminder({ actor, userId, reminderId }) {
  assertPatientScope({ actor, userId });

  const reminder = await prisma.reminder.findFirst({
    where: {
      reminderId,
      userId,
    },
  });

  if (!reminder) {
    throw createHttpError('Reminder tidak ditemukan', NOT_FOUND);
  }

  const result = await prisma.reminder.deleteMany({
    where: {
      reminderId,
      userId,
    },
  });

  if (result.count === 0) {
    throw createHttpError('Reminder tidak ditemukan', NOT_FOUND);
  }

  await invalidateCacheTags(
    buildMedicationCacheTags({
      userId,
      medicationId: reminder.medicationId,
    })
  );

  return {
    reminderId,
  };
}

async function listMedicationLogs({ actor, userId, medicationId, query }) {
  assertPatientScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const skip = (page - 1) * limit;

  await ensureMedicationOwnership(prisma, { medicationId, userId });

  const where = {
    userId,
    medicationId,
  };

  if (query?.startDate || query?.endDate) {
    where.medicationDate = {};
  }

  if (query?.startDate) {
    where.medicationDate.gte = toPrismaDate(query.startDate);
  }

  if (query?.endDate) {
    where.medicationDate.lte = toPrismaDate(query.endDate);
  }

  const [logs, totalItems] = await Promise.all([
    prisma.medicationLog.findMany({
      where,
      orderBy: [{ medicationDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.medicationLog.count({
      where,
    }),
  ]);

  return {
    items: logs.map(toMedicationLogDto),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

async function createMedicationLog({ actor, userId, medicationId, payload }) {
  assertPatientScope({ actor, userId });

  const medicationLog = await prisma.$transaction(async (tx) => {
    await ensureMedicationOwnership(tx, { medicationId, userId });

    return tx.medicationLog.create({
      data: {
        userId,
        medicationId,
        status: payload.status || 'taken',
        medicationDate: toPrismaDate(payload.medicationDate),
        medicationTime: payload.medicationTime ? toPrismaTime(payload.medicationTime) : null,
      },
    });
  });

  return toMedicationLogDto(medicationLog);
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
};
