const patientCareRepository = require('../../repositories/patientCareRepository');
const biometricRepository = require('../../repositories/biometricRepository');

function toIso(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toDateOnly(value) {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function toTimeOnly(value) {
  const iso = toIso(value);
  return iso ? iso.slice(11, 16) : null;
}

function calculateAge(dateOfBirth) {
  const dobIso = toDateOnly(dateOfBirth);
  if (!dobIso) {
    return null;
  }

  const dob = new Date(`${dobIso}T00:00:00.000Z`);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();
  const birthMonth = dob.getUTCMonth() + 1;
  const birthDay = dob.getUTCDate();

  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function formatPatientIdentity(row) {
  const dateOfBirth = toDateOnly(row.date_of_birth);

  return {
    patientId: row.patient_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.tel_no || null,
    dateOfBirth,
    age: calculateAge(dateOfBirth),
    sex: row.sex || null,
  };
}

function mapDashboardSummary({ identity, latestVitals, latestVitalsByField, thresholds }) {
  const response = {
    patient: formatPatientIdentity(identity),
    latestVitals,
    thresholds,
  };

  if (latestVitalsByField) {
    response.latestVitalsByField = latestVitalsByField;
  }

  return response;
}

function mapEmergencyContact(row) {
  return {
    emergencyContactId: row.emergency_contact_id,
    userId: row.user_id,
    contactLabel: row.contact_label,
    contactNumber: row.contact_number,
    isPriority: Boolean(row.is_priority),
    createdAt: toIso(row.created_at),
  };
}

function isEmergencyPriorityConflictError(error) {
  return (
    error?.code === '23505' &&
    String(error?.constraint || '').includes('uq_emergency_contacts_single_priority_per_user')
  );
}

function mapBodyMetric(row) {
  return {
    metricId: row.metric_id,
    diaryId: row.diary_id,
    conditionTag: row.condition_tag,
    bodyHeight: row.body_height !== null ? Number(row.body_height) : null,
    bodyWeight: row.body_weight !== null ? Number(row.body_weight) : null,
    bmi: row.bmi !== null ? Number(row.bmi) : null,
    systolicPressure: row.systolic_pressure,
    diastolicPressure: row.diastolic_pressure,
    heartRate: row.heart_rate,
    timeStamp: toIso(row.time_stamp),
  };
}

function mapLatestVitalSnapshot(snapshot) {
  return {
    latestHeartRate:
      snapshot?.heartRate?.value_numeric !== null &&
      snapshot?.heartRate?.value_numeric !== undefined
        ? Number(snapshot.heartRate.value_numeric)
        : null,
    latestHeartRateMeasuredAt: toIso(snapshot?.heartRate?.measured_at),
    latestOxygenSaturation:
      snapshot?.oxygenSaturation?.value_numeric !== null &&
      snapshot?.oxygenSaturation?.value_numeric !== undefined
        ? Number(snapshot.oxygenSaturation.value_numeric)
        : null,
    latestOxygenSaturationMeasuredAt: toIso(snapshot?.oxygenSaturation?.measured_at),
  };
}

function enrichBodyMetricWithLatestVitals(bodyMetric, snapshot) {
  return {
    ...bodyMetric,
    ...mapLatestVitalSnapshot(snapshot),
  };
}

function mapSymptom(row) {
  return {
    symptomId: row.symptom_id,
    diaryId: row.diary_id,
    symptomName: row.symptom_name,
    symptomCode: row.symptom_code,
    bodyArea: row.body_area,
    isChestPain: row.is_chest_pain ?? null,
    painFrequencyCode: row.pain_frequency_code,
    painLocationCode: row.pain_location_code,
    intensity: row.intensity,
    note: row.note,
    time: toTimeOnly(row.time_stamp),
    timeStamp: toIso(row.time_stamp),
  };
}

function mapActivity(row) {
  return {
    activityId: row.activity_id,
    diaryId: row.diary_id,
    name: row.name,
    activityCategory: row.activity_category,
    intensityLevel: row.intensity_level,
    transportMode: row.transport_mode,
    outdoorMinutes: row.outdoor_minutes,
    duration: row.duration,
    heartRate: row.heart_rate,
    userFeeling: row.user_feeling,
    note: row.note,
    timeStamp: toIso(row.time_stamp),
  };
}

function mapConsumption(row) {
  return {
    consumptionId: row.consumption_id,
    diaryId: row.diary_id,
    type: row.type,
    name: row.name,
    portion: row.portion,
    portionGrams: row.portion_grams !== null ? Number(row.portion_grams) : null,
    fdcFoodId: row.fdc_food_id,
    nutritionSource: row.nutrition_source,
    nutritionSnapshot: {
      energyKcal: row.energy_kcal !== null ? Number(row.energy_kcal) : null,
      proteinG: row.protein_g !== null ? Number(row.protein_g) : null,
      carbohydrateG: row.carbohydrate_g !== null ? Number(row.carbohydrate_g) : null,
      sugarG: row.sugar_g !== null ? Number(row.sugar_g) : null,
      fiberG: row.fiber_g !== null ? Number(row.fiber_g) : null,
      totalFatG: row.total_fat_g !== null ? Number(row.total_fat_g) : null,
      saturatedFatG: row.saturated_fat_g !== null ? Number(row.saturated_fat_g) : null,
      monounsaturatedFatG:
        row.monounsaturated_fat_g !== null ? Number(row.monounsaturated_fat_g) : null,
      polyunsaturatedFatG:
        row.polyunsaturated_fat_g !== null ? Number(row.polyunsaturated_fat_g) : null,
      cholesterolMg: row.cholesterol_mg !== null ? Number(row.cholesterol_mg) : null,
      calciumMg: row.calcium_mg !== null ? Number(row.calcium_mg) : null,
    },
    note: row.note,
    time: toTimeOnly(row.time_stamp),
    timeStamp: toIso(row.time_stamp),
  };
}

function mapSleepRecord(row) {
  if (!row) {
    return null;
  }

  return {
    sleepRecordId: row.sleep_record_id,
    diaryId: row.diary_id,
    sleepTime: toTimeOnly(row.sleep_time),
    wakeTime: toTimeOnly(row.wake_time),
    sleepDurationHours: row.sleep_duration_hours !== null ? Number(row.sleep_duration_hours) : null,
    source: row.source,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapDiary(row) {
  return {
    diaryId: row.diary_id,
    userId: row.user_id,
    diaryDate: toDateOnly(row.diary_date),
    createdAt: toIso(row.created_at),
  };
}

async function mapHeartDiaryDetail(row) {
  const [metrics, symptoms, activities, consumptions, sleepRecord, latestVitalSnapshot] =
    await Promise.all([
      patientCareRepository.listDailyBodyMetrics(row.diary_id),
      patientCareRepository.listDailySymptoms(row.diary_id),
      patientCareRepository.listDailyActivities(row.diary_id),
      patientCareRepository.listDailyConsumptions(row.diary_id),
      patientCareRepository.getDailySleepRecord(row.diary_id),
      biometricRepository.getLatestVitalSnapshot(row.user_id),
    ]);

  return {
    ...mapDiary(row),
    bodyMetrics: metrics.map((metric) =>
      enrichBodyMetricWithLatestVitals(mapBodyMetric(metric), latestVitalSnapshot)
    ),
    symptoms: symptoms.map(mapSymptom),
    activities: activities.map(mapActivity),
    consumptions: consumptions.map(mapConsumption),
    sleepRecord: mapSleepRecord(sleepRecord),
  };
}

module.exports = {
  formatPatientIdentity,
  mapDashboardSummary,
  mapEmergencyContact,
  isEmergencyPriorityConflictError,
  mapBodyMetric,
  mapLatestVitalSnapshot,
  enrichBodyMetricWithLatestVitals,
  mapSymptom,
  mapActivity,
  mapConsumption,
  mapSleepRecord,
  mapDiary,
  mapHeartDiaryDetail,
};
