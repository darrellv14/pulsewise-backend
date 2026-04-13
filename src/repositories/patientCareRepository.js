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
    note: row.note,
    time_stamp: row.timeStamp,
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

async function createDailyBodyMetric({
  diaryId,
  conditionTag,
  bodyHeight,
  bodyWeight,
  bmi,
  systolicPressure,
  diastolicPressure,
  heartRate,
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

async function createDailySymptom({ diaryId, symptomName, intensity, note, timeStamp }) {
  const row = await prisma.dailySymptom.create({
    data: {
      diaryId,
      symptomName,
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
      userFeeling,
      note,
      timeStamp: timeStamp ? toDateTime(timeStamp) : undefined,
    },
  });

  return mapDailyActivity(row);
}

async function createDailyConsumption({ diaryId, type, name, portion, note, timeStamp }) {
  const row = await prisma.dailyConsumption.create({
    data: {
      diaryId,
      type,
      name,
      portion,
      note,
      timeStamp: timeStamp ? toDateTime(timeStamp) : undefined,
    },
  });

  return mapDailyConsumption(row);
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
  createDailyBodyMetric,
  updateDailyBodyMetric,
  createDailySymptom,
  createDailyActivity,
  createDailyConsumption,
  updateUserAvatar,
};
