const prisma = require('../../config/prisma');
const { createHttpError } = require('../../utils/httpError');
const { NOT_FOUND } = require('../../constants/httpStatus');
const { buildMedicationCacheTags, invalidateCacheTags } = require('./cache');
const {
  assertPatientScope,
  normalizeNullableText,
  normalizeConditionTag,
  validateMedicationScheduleState,
  buildReminderEntries,
  toPrismaDate,
  toMedicationDto,
  hasMedicationSchedulePayload,
  resolveMedicationScheduleStateForUpdate,
} = require('./shared');

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
        conditionTag: normalizeConditionTag(payload.conditionTag),
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
      medicationData.conditionTag = normalizeConditionTag(payload.conditionTag);
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
      const nextScheduleState = validateMedicationScheduleState(
        resolveMedicationScheduleStateForUpdate({
          payload,
          currentMedication,
        })
      );

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

module.exports = {
  createMedication,
  updateMedication,
  deleteMedication,
};
