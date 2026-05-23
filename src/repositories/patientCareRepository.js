const prisma = require('../config/prisma');

function toNullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function toDateOnly(dateValue) {
  return dateValue ? new Date(`${dateValue}T00:00:00.000Z`) : null;
}

function toDateTime(value) {
  return value ? new Date(value) : null;
}

function mapEmergencyContact(row) {
  if (!row) {
    return null;
  }

  return {
    emergency_contact_id: row.emergencyContactId,
    user_id: row.userId,
    contact_label: row.contactLabel,
    contact_number: row.contactNumber,
    is_priority: row.isPriority,
    created_at: row.createdAt,
  };
}

function mapHeartDiary(row) {
  if (!row) {
    return null;
  }

  return {
    diary_id: row.diaryId,
    user_id: row.userId,
    diary_date: row.diaryDate,
    created_at: row.createdAt,
  };
}

function mapDailyMetric(row) {
  if (!row) {
    return null;
  }

  return {
    metric_id: row.metricId,
    diary_id: row.diaryId,
    condition_tag: row.conditionTag,
    body_height: toNullableNumber(row.bodyHeight),
    body_weight: toNullableNumber(row.bodyWeight),
    bmi: toNullableNumber(row.bmi),
    systolic_pressure: row.systolicPressure,
    diastolic_pressure: row.diastolicPressure,
    heart_rate: row.heartRate,
    oxygen_saturation: row.oxygenSaturation,
    time_stamp: row.timeStamp,
  };
}

function mapDailySymptom(row) {
  if (!row) {
    return null;
  }

  return {
    symptom_id: row.symptomId,
    diary_id: row.diaryId,
    symptom_name: row.symptomName,
    symptom_code: row.symptomCode,
    body_area: row.bodyArea,
    is_chest_pain: row.isChestPain,
    pain_frequency_code: row.painFrequencyCode,
    pain_location_code: row.painLocationCode,
    intensity: row.intensity,
    note: row.note,
    time_stamp: row.timeStamp,
  };
}

function mapDailyActivity(row) {
  if (!row) {
    return null;
  }

  return {
    activity_id: row.activityId,
    diary_id: row.diaryId,
    name: row.name,
    duration: row.duration,
    heart_rate: row.heartRate,
    activity_category: row.activityCategory,
    intensity_level: row.intensityLevel,
    transport_mode: row.transportMode,
    outdoor_minutes: row.outdoorMinutes,
    user_feeling: row.userFeeling,
    note: row.note,
    time_stamp: row.timeStamp,
  };
}

function mapDailyConsumption(row) {
  if (!row) {
    return null;
  }

  return {
    consumption_id: row.consumptionId,
    diary_id: row.diaryId,
    type: row.type,
    name: row.name,
    portion: row.portion,
    portion_grams: toNullableNumber(row.portionGrams),
    fdc_food_id: row.fdcFoodId,
    nutrition_source: row.nutritionSource,
    energy_kcal: toNullableNumber(row.energyKcal),
    protein_g: toNullableNumber(row.proteinG),
    carbohydrate_g: toNullableNumber(row.carbohydrateG),
    sugar_g: toNullableNumber(row.sugarG),
    fiber_g: toNullableNumber(row.fiberG),
    total_fat_g: toNullableNumber(row.totalFatG),
    saturated_fat_g: toNullableNumber(row.saturatedFatG),
    monounsaturated_fat_g: toNullableNumber(row.monounsaturatedFatG),
    polyunsaturated_fat_g: toNullableNumber(row.polyunsaturatedFatG),
    cholesterol_mg: toNullableNumber(row.cholesterolMg),
    calcium_mg: toNullableNumber(row.calciumMg),
    note: row.note,
    time_stamp: row.timeStamp,
  };
}

function mapSleepRecord(row) {
  if (!row) {
    return null;
  }

  return {
    sleep_record_id: row.sleepRecordId,
    diary_id: row.diaryId,
    sleep_time: row.sleepTime,
    wake_time: row.wakeTime,
    sleep_duration_hours: toNullableNumber(row.sleepDurationHours),
    source: row.source,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

async function listEmergencyContacts({ userId, limit, offset }) {
  const [items, totalItems] = await Promise.all([
    prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ isPriority: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
    prisma.emergencyContact.count({
      where: { userId },
    }),
  ]);

  return {
    items: items.map(mapEmergencyContact),
    totalItems,
  };
}

async function listHeartDiaries({ userId, startDate, endDate, limit, offset }) {
  const where = { userId };
  if (startDate || endDate) {
    where.diaryDate = {};
    if (startDate) {
      where.diaryDate.gte = toDateOnly(startDate);
    }
    if (endDate) {
      where.diaryDate.lte = toDateOnly(endDate);
    }
  }

  const [items, totalItems] = await Promise.all([
    prisma.heartDiary.findMany({
      where,
      orderBy: { diaryDate: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.heartDiary.count({ where }),
  ]);

  return {
    items: items.map(mapHeartDiary),
    totalItems,
  };
}

async function findPriorityEmergencyContact({ userId, excludeEmergencyContactId = null }) {
  const row = await prisma.emergencyContact.findFirst({
    where: {
      userId,
      isPriority: true,
      emergencyContactId: excludeEmergencyContactId
        ? {
            not: excludeEmergencyContactId,
          }
        : undefined,
    },
  });

  return mapEmergencyContact(row);
}

async function createEmergencyContact({ userId, contactLabel, contactNumber, isPriority }) {
  const row = await prisma.emergencyContact.create({
    data: {
      userId,
      contactLabel,
      contactNumber,
      isPriority,
    },
  });

  return mapEmergencyContact(row);
}

async function updateEmergencyContact({
  userId,
  emergencyContactId,
  contactLabel,
  contactNumber,
  isPriority,
}) {
  const data = {};
  if (contactLabel !== null) {
    data.contactLabel = contactLabel;
  }
  if (contactNumber !== null) {
    data.contactNumber = contactNumber;
  }
  if (isPriority !== null) {
    data.isPriority = isPriority;
  }

  if (Object.keys(data).length === 0) {
    const row = await prisma.emergencyContact.findFirst({
      where: {
        emergencyContactId,
        userId,
      },
    });

    return mapEmergencyContact(row);
  }

  const result = await prisma.emergencyContact.updateMany({
    where: {
      emergencyContactId,
      userId,
    },
    data,
  });

  if (result.count === 0) {
    return null;
  }

  const row = await prisma.emergencyContact.findUnique({
    where: {
      emergencyContactId,
    },
  });

  return mapEmergencyContact(row);
}

async function deleteEmergencyContact({ userId, emergencyContactId }) {
  const result = await prisma.emergencyContact.deleteMany({
    where: {
      emergencyContactId,
      userId,
    },
  });

  return result.count;
}

async function upsertHeartDiary({ userId, diaryDate }) {
  const row = await prisma.heartDiary.upsert({
    where: {
      userId_diaryDate: {
        userId,
        diaryDate: toDateOnly(diaryDate),
      },
    },
    create: {
      userId,
      diaryDate: toDateOnly(diaryDate),
    },
    update: {},
  });

  return mapHeartDiary(row);
}

async function getHeartDiaryByDate({ userId, diaryDate }) {
  const row = await prisma.heartDiary.findUnique({
    where: {
      userId_diaryDate: {
        userId,
        diaryDate: toDateOnly(diaryDate),
      },
    },
  });

  return mapHeartDiary(row);
}

async function getHeartDiary({ userId, diaryId }) {
  const row = await prisma.heartDiary.findFirst({
    where: {
      diaryId,
      userId,
    },
  });

  return mapHeartDiary(row);
}

async function listDailyBodyMetrics(diaryId) {
  const rows = await prisma.dailyBodyMetric.findMany({
    where: { diaryId },
    orderBy: { timeStamp: 'desc' },
  });

  return rows.map(mapDailyMetric);
}

async function getLatestDailyBodyMetric(diaryId) {
  const row = await prisma.dailyBodyMetric.findFirst({
    where: { diaryId },
    orderBy: [{ timeStamp: 'desc' }, { metricId: 'desc' }],
  });

  return mapDailyMetric(row);
}

async function listDailySymptoms(diaryId) {
  const rows = await prisma.dailySymptom.findMany({
    where: { diaryId },
    orderBy: { timeStamp: 'desc' },
  });

  return rows.map(mapDailySymptom);
}

async function listDailyActivities(diaryId) {
  const rows = await prisma.dailyActivity.findMany({
    where: { diaryId },
    orderBy: { timeStamp: 'desc' },
  });

  return rows.map(mapDailyActivity);
}

async function listDailyConsumptions(diaryId) {
  const rows = await prisma.dailyConsumption.findMany({
    where: { diaryId },
    orderBy: { timeStamp: 'desc' },
  });

  return rows.map(mapDailyConsumption);
}

async function getDailySleepRecord(diaryId) {
  const row = await prisma.dailySleepRecord.findUnique({
    where: {
      diaryId,
    },
  });

  return mapSleepRecord(row);
}

async function createDailyBodyMetric({
  diaryId,
  conditionTag,
  bodyHeight,
  bodyWeight,
  bmi,
  systolicPressure,
  diastolicPressure,
  heartRate,
  oxygenSaturation,
  timeStamp,
}) {
  const row = await prisma.dailyBodyMetric.create({
    data: {
      diaryId,
      conditionTag,
      bodyHeight,
      bodyWeight,
      bmi,
      systolicPressure,
      diastolicPressure,
      heartRate,
      oxygenSaturation,
      timeStamp: timeStamp ? toDateTime(timeStamp) : undefined,
    },
  });

  return mapDailyMetric(row);
}

async function updateDailyBodyMetric({
  metricId,
  conditionTag,
  bodyHeight,
  bodyWeight,
  bmi,
  systolicPressure,
  diastolicPressure,
  heartRate,
  oxygenSaturation,
  timeStamp,
}) {
  const data = {};
  if (conditionTag !== undefined) {
    data.conditionTag = conditionTag;
  }
  if (bodyHeight !== undefined) {
    data.bodyHeight = bodyHeight;
  }
  if (bodyWeight !== undefined) {
    data.bodyWeight = bodyWeight;
  }
  if (bmi !== undefined) {
    data.bmi = bmi;
  }
  if (systolicPressure !== undefined) {
    data.systolicPressure = systolicPressure;
  }
  if (diastolicPressure !== undefined) {
    data.diastolicPressure = diastolicPressure;
  }
  if (heartRate !== undefined) {
    data.heartRate = heartRate;
  }
  if (oxygenSaturation !== undefined) {
    data.oxygenSaturation = oxygenSaturation;
  }
  if (timeStamp !== undefined && timeStamp !== null) {
    data.timeStamp = toDateTime(timeStamp);
  }

  if (Object.keys(data).length === 0) {
    return null;
  }

  const row = await prisma.dailyBodyMetric.update({
    where: {
      metricId,
    },
    data,
  });

  return mapDailyMetric(row);
}

async function createDailySymptom({
  diaryId,
  symptomName,
  symptomCode,
  bodyArea,
  isChestPain,
  painFrequencyCode,
  painLocationCode,
  intensity,
  note,
  timeStamp,
}) {
  const row = await prisma.dailySymptom.create({
    data: {
      diaryId,
      symptomName,
      symptomCode,
      bodyArea,
      isChestPain,
      painFrequencyCode,
      painLocationCode,
      intensity,
      note,
      timeStamp: timeStamp ? toDateTime(timeStamp) : undefined,
    },
  });

  return mapDailySymptom(row);
}

async function createDailyActivity({
  diaryId,
  name,
  duration,
  heartRate,
  activityCategory,
  intensityLevel,
  transportMode,
  outdoorMinutes,
  userFeeling,
  note,
  timeStamp,
}) {
  const row = await prisma.dailyActivity.create({
    data: {
      diaryId,
      name,
      duration,
      heartRate,
      activityCategory,
      intensityLevel,
      transportMode,
      outdoorMinutes,
      userFeeling,
      note,
      timeStamp: timeStamp ? toDateTime(timeStamp) : undefined,
    },
  });

  return mapDailyActivity(row);
}

async function createDailyConsumption({
  diaryId,
  type,
  name,
  portion,
  portionGrams,
  fdcFoodId,
  nutritionSource,
  energyKcal,
  proteinG,
  carbohydrateG,
  sugarG,
  fiberG,
  totalFatG,
  saturatedFatG,
  monounsaturatedFatG,
  polyunsaturatedFatG,
  cholesterolMg,
  calciumMg,
  note,
  timeStamp,
}) {
  const row = await prisma.dailyConsumption.create({
    data: {
      diaryId,
      type,
      name,
      portion,
      portionGrams,
      fdcFoodId,
      nutritionSource,
      energyKcal,
      proteinG,
      carbohydrateG,
      sugarG,
      fiberG,
      totalFatG,
      saturatedFatG,
      monounsaturatedFatG,
      polyunsaturatedFatG,
      cholesterolMg,
      calciumMg,
      note,
      timeStamp: timeStamp ? toDateTime(timeStamp) : undefined,
    },
  });

  return mapDailyConsumption(row);
}

async function upsertDailySleepRecord({ diaryId, sleepTime, wakeTime, sleepDurationHours, source }) {
  const row = await prisma.dailySleepRecord.upsert({
    where: {
      diaryId,
    },
    create: {
      diaryId,
      sleepTime: sleepTime ? new Date(`1970-01-01T${sleepTime}:00.000Z`) : undefined,
      wakeTime: wakeTime ? new Date(`1970-01-01T${wakeTime}:00.000Z`) : undefined,
      sleepDurationHours,
      source,
    },
    update: {
      sleepTime: sleepTime !== undefined ? (sleepTime ? new Date(`1970-01-01T${sleepTime}:00.000Z`) : null) : undefined,
      wakeTime: wakeTime !== undefined ? (wakeTime ? new Date(`1970-01-01T${wakeTime}:00.000Z`) : null) : undefined,
      sleepDurationHours: sleepDurationHours !== undefined ? sleepDurationHours : undefined,
      source: source !== undefined ? source : undefined,
      updatedAt: new Date(),
    },
  });

  return mapSleepRecord(row);
}

async function updateUserAvatar({ userId, avatarPhoto }) {
  const row = await prisma.user.update({
    where: {
      userId,
    },
    data: {
      avatarPhoto,
      updatedAt: new Date(),
    },
  });

  return {
    user_id: row.userId,
    avatar_photo: row.avatarPhoto,
    updated_at: row.updatedAt,
  };
}

module.exports = {
  listEmergencyContacts,
  findPriorityEmergencyContact,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  upsertHeartDiary,
  getHeartDiaryByDate,
  listHeartDiaries,
  getHeartDiary,
  listDailyBodyMetrics,
  getLatestDailyBodyMetric,
  listDailySymptoms,
  listDailyActivities,
  listDailyConsumptions,
  getDailySleepRecord,
  createDailyBodyMetric,
  updateDailyBodyMetric,
  createDailySymptom,
  createDailyActivity,
  createDailyConsumption,
  upsertDailySleepRecord,
  updateUserAvatar,
};
