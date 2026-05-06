const {
  normalizeNullableText,
  normalizeConditionTag,
  validateMedicationScheduleState,
  hasMedicationSchedulePayload,
  resolveMedicationScheduleStateForUpdate,
} = require('./shared');

function buildMedicationUpdatePlan({ payload, currentMedication }) {
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
    medicationData.startDate = payload.startDate;
  }

  if (payload.note !== undefined) {
    medicationData.note = normalizeNullableText(payload.note);
  }

  let nextScheduleState = null;

  if (scheduleTouched) {
    nextScheduleState = validateMedicationScheduleState(
      resolveMedicationScheduleStateForUpdate({
        payload,
        currentMedication,
      })
    );

    medicationData.frequency = nextScheduleState.frequency;
    medicationData.numOfDays = nextScheduleState.numOfDays;
  }

  return {
    medicationData,
    nextScheduleState,
    scheduleTouched,
  };
}

module.exports = {
  buildMedicationUpdatePlan,
};
