const prisma = require('../../config/prisma');
const { createHttpError } = require('../../utils/httpError');
const { NOT_FOUND } = require('../../constants/httpStatus');
const { buildReminderEntries, toPrismaDate } = require('./shared');

async function loadMedicationWithReminders(tx, { userId, medicationId }) {
  return tx.medication.findFirst({
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
}

async function createMedicationGraph({
  userId,
  payload,
  normalizedMedicationData,
  scheduleState,
}) {
  const remindersPayload = buildReminderEntries(scheduleState);

  return prisma.$transaction(async (tx) => {
    const createdMedication = await tx.medication.create({
      data: {
        userId,
        ...normalizedMedicationData,
        startDate: toPrismaDate(payload.startDate),
        frequency: scheduleState.frequency,
        numOfDays: scheduleState.numOfDays,
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
}

async function replaceMedicationReminders(tx, { userId, medicationId, scheduleState }) {
  await tx.reminder.deleteMany({
    where: {
      userId,
      medicationId,
    },
  });

  const reminderEntries = buildReminderEntries(scheduleState);
  if (reminderEntries.length === 0) {
    return;
  }

  await tx.reminder.createMany({
    data: reminderEntries.map((entry) => ({
      userId,
      medicationId,
      scheduleTime: entry.scheduleTime,
      dayOfWeek: entry.dayOfWeek,
    })),
  });
}

async function updateMedicationGraph({ userId, medicationId, plan, currentMedication = null }) {
  return prisma.$transaction(async (tx) => {
    const existingMedication =
      currentMedication ?? (await loadMedicationWithReminders(tx, { userId, medicationId }));

    if (!existingMedication) {
      throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
    }

    if (plan.scheduleTouched) {
      await replaceMedicationReminders(tx, {
        userId,
        medicationId,
        scheduleState: plan.nextScheduleState,
      });
    }

    if (Object.keys(plan.medicationData).length > 0) {
      await tx.medication.update({
        where: {
          medicationId,
        },
        data: {
          ...plan.medicationData,
          startDate:
            plan.medicationData.startDate !== undefined
              ? toPrismaDate(plan.medicationData.startDate)
              : undefined,
        },
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
}

async function deleteMedicationOwned({ userId, medicationId }) {
  return prisma.$transaction(async (tx) => {
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
}

module.exports = {
  createMedicationGraph,
  loadMedicationWithReminders,
  updateMedicationGraph,
  deleteMedicationOwned,
};
