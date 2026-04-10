const prisma = require('../config/prisma');
const { FORBIDDEN, NOT_FOUND, CONFLICT } = require('../constants/httpStatus');
const { buildPagination, normalizePaginationInput } = require('../utils/pagination');

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

function toReminderDto(reminder) {
  return {
    reminderId: reminder.reminderId,
    userId: reminder.userId,
    medicationId: reminder.medicationId,
    scheduleTime: formatTimeValue(reminder.scheduleTime),
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
    createdAt: medication.createdAt.toISOString(),
    reminders: (medication.reminders || []).map(toReminderDto),
  };
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
  { userId, medicationId, scheduleTime, excludeReminderId }
) {
  const duplicated = await tx.reminder.findFirst({
    where: {
      userId,
      medicationId,
      scheduleTime,
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

  const [medications, totalItems] = await Promise.all([
    prisma.medication.findMany({
      where: {
        userId,
      },
      include: {
        reminders: {
          orderBy: {
            scheduleTime: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.medication.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    items: medications.map(toMedicationDto),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

async function getMedicationById({ actor, userId, medicationId }) {
  assertPatientScope({ actor, userId });

  const medication = await prisma.medication.findFirst({
    where: {
      medicationId,
      userId,
    },
    include: {
      reminders: {
        orderBy: {
          scheduleTime: 'asc',
        },
      },
    },
  });

  if (!medication) {
    throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
  }

  return toMedicationDto(medication);
}

async function createMedication({ actor, userId, payload }) {
  assertPatientScope({ actor, userId });

  const remindersPayload = payload.reminders || [];

  const medication = await prisma.$transaction(async (tx) => {
    const createdMedication = await tx.medication.create({
      data: {
        userId,
        name: payload.name.trim(),
        description: normalizeNullableText(payload.description),
        conditionTag: normalizeNullableText(payload.conditionTag),
      },
    });

    if (remindersPayload.length > 0) {
      for (const reminderPayload of remindersPayload) {
        await assertNoDuplicateReminderTime(tx, {
          userId,
          medicationId: createdMedication.medicationId,
          scheduleTime: toPrismaTime(reminderPayload.scheduleTime),
        });
      }

      await tx.reminder.createMany({
        data: remindersPayload.map((reminderPayload) => ({
          userId,
          medicationId: createdMedication.medicationId,
          scheduleTime: toPrismaTime(reminderPayload.scheduleTime),
        })),
      });
    }

    return tx.medication.findUnique({
      where: {
        medicationId: createdMedication.medicationId,
      },
      include: {
        reminders: {
          orderBy: {
            scheduleTime: 'asc',
          },
        },
      },
    });
  });

  return toMedicationDto(medication);
}

async function updateMedication({ actor, userId, medicationId, payload }) {
  assertPatientScope({ actor, userId });

  const medication = await prisma.$transaction(async (tx) => {
    await ensureMedicationOwnership(tx, { medicationId, userId });

    const medicationData = {};

    if (payload.name !== undefined) {
      medicationData.name = payload.name.trim();
    }

    if (payload.description !== undefined) {
      medicationData.description = normalizeNullableText(payload.description);
    }

    if (payload.conditionTag !== undefined) {
      medicationData.conditionTag = normalizeNullableText(payload.conditionTag);
    }

    if (Object.keys(medicationData).length > 0) {
      await tx.medication.update({
        where: {
          medicationId,
        },
        data: medicationData,
      });
    }

    if (payload.reminders !== undefined) {
      const remindersPayload = payload.reminders;

      if (remindersPayload.length > 0) {
        for (const reminderPayload of remindersPayload) {
          await assertNoDuplicateReminderTime(tx, {
            userId,
            medicationId,
            scheduleTime: toPrismaTime(reminderPayload.scheduleTime),
          });
        }
      }

      await tx.reminder.deleteMany({
        where: {
          userId,
          medicationId,
        },
      });

      if (remindersPayload.length > 0) {
        await tx.reminder.createMany({
          data: remindersPayload.map((reminderPayload) => ({
            userId,
            medicationId,
            scheduleTime: toPrismaTime(reminderPayload.scheduleTime),
          })),
        });
      }
    }

    return tx.medication.findUnique({
      where: {
        medicationId,
      },
      include: {
        reminders: {
          orderBy: {
            scheduleTime: 'asc',
          },
        },
      },
    });
  });

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

  return {
    medicationId,
  };
}

async function listRemindersByMedication({ actor, userId, medicationId, query }) {
  assertPatientScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const skip = (page - 1) * limit;

  await ensureMedicationOwnership(prisma, { medicationId, userId });

  const where = {
    userId,
    medicationId,
  };

  const [reminders, totalItems] = await Promise.all([
    prisma.reminder.findMany({
      where,
      orderBy: {
        scheduleTime: 'asc',
      },
      skip,
      take: limit,
    }),
    prisma.reminder.count({
      where,
    }),
  ]);

  return {
    items: reminders.map(toReminderDto),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

async function createReminder({ actor, userId, medicationId, payload }) {
  assertPatientScope({ actor, userId });

  const reminder = await prisma.$transaction(async (tx) => {
    await ensureMedicationOwnership(tx, { medicationId, userId });

    const scheduleTime = toPrismaTime(payload.scheduleTime);
    await assertNoDuplicateReminderTime(tx, {
      userId,
      medicationId,
      scheduleTime,
    });

    return tx.reminder.create({
      data: {
        userId,
        medicationId,
        scheduleTime,
      },
    });
  });

  return toReminderDto(reminder);
}

async function updateReminder({ actor, userId, reminderId, payload }) {
  assertPatientScope({ actor, userId });

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

    const scheduleTime = toPrismaTime(payload.scheduleTime);
    await assertNoDuplicateReminderTime(tx, {
      userId,
      medicationId: currentReminder.medicationId,
      scheduleTime,
      excludeReminderId: reminderId,
    });

    return tx.reminder.update({
      where: {
        reminderId,
      },
      data: {
        scheduleTime,
      },
    });
  });

  return toReminderDto(reminder);
}

async function deleteReminder({ actor, userId, reminderId }) {
  assertPatientScope({ actor, userId });

  const result = await prisma.reminder.deleteMany({
    where: {
      reminderId,
      userId,
    },
  });

  if (result.count === 0) {
    throw createHttpError('Reminder tidak ditemukan', NOT_FOUND);
  }

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
        medicationDate: toPrismaDate(payload.medicationDate),
        medicationTime: payload.medicationTime ? toPrismaTime(payload.medicationTime) : null,
      },
    });
  });

  return toMedicationLogDto(medicationLog);
}

module.exports = {
  listMedications,
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
