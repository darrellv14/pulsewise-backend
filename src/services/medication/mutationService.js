const prisma = require('../../config/prisma');
const { NOT_FOUND } = require('../../constants/httpStatus');
const { createHttpError } = require('../../utils/httpError');
const { buildMedicationCacheTags, invalidateCacheTags } = require('./cache');
const {
  assertPatientScope,
  normalizeNullableText,
  normalizeConditionTag,
  validateMedicationScheduleState,
  toMedicationDto,
} = require('./shared');
const { buildMedicationUpdatePlan } = require('./updatePlan');
const {
  createMedicationGraph,
  loadMedicationWithReminders,
  updateMedicationGraph,
  deleteMedicationOwned,
} = require('./persistenceService');

async function createMedication({ actor, userId, payload }) {
  assertPatientScope({ actor, userId });

  const scheduleState = validateMedicationScheduleState({
    frequency: payload.frequency,
    intakeTimes: payload.intakeTimes,
    daysOfWeek: payload.daysOfWeek,
    numOfDays: payload.numOfDays,
  });
  const medication = await createMedicationGraph({
    userId,
    payload,
    scheduleState,
    normalizedMedicationData: {
      name: payload.name.trim(),
      description: normalizeNullableText(payload.description),
      conditionTag: normalizeConditionTag(payload.conditionTag),
      form: normalizeNullableText(payload.form),
      color: normalizeNullableText(payload.color),
      singleDose: payload.singleDose ?? null,
      singleDoseUnit: normalizeNullableText(payload.singleDoseUnit),
      note: normalizeNullableText(payload.note),
    },
  });

  await invalidateCacheTags(buildMedicationCacheTags({ userId }));

  return toMedicationDto(medication);
}

async function updateMedication({ actor, userId, medicationId, payload }) {
  assertPatientScope({ actor, userId });

  const currentMedication = await prisma.$transaction((tx) =>
    loadMedicationWithReminders(tx, { userId, medicationId })
  );
  if (!currentMedication) {
    throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
  }
  const plan = buildMedicationUpdatePlan({ payload, currentMedication });
  const medication = await updateMedicationGraph({
    userId,
    medicationId,
    plan,
    currentMedication,
  });

  await invalidateCacheTags(buildMedicationCacheTags({ userId, medicationId }));

  return toMedicationDto(medication);
}

async function deleteMedication({ actor, userId, medicationId }) {
  assertPatientScope({ actor, userId });

  await deleteMedicationOwned({ userId, medicationId });

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
