const prisma = require('../config/prisma');

function toDateOnly(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

function toNullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapAssessment(row) {
  if (!row) {
    return null;
  }

  return {
    assessmentId: row.assessmentId,
    patientId: row.patientId,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    assessmentDate: row.assessmentDate?.toISOString().slice(0, 10) || null,
    age: row.age,
    sex: row.sex,
    chest_pain_type: row.chestPainType,
    resting_bp_s: row.restingBpS,
    fasting_blood_sugar: row.fastingBloodSugar,
    max_heart_rate: row.maxHeartRate,
    exercise_angina: row.exerciseAngina,
    old_peak: toNullableNumber(row.oldPeak),
    st_slope: row.stSlope,
    createdAt: row.createdAt?.toISOString() || null,
    updatedAt: row.updatedAt?.toISOString() || null,
  };
}

async function getLatestPatientHeartRiskAssessment(patientId) {
  const row = await prisma.patientHeartRiskAssessment.findFirst({
    where: { patientId },
    orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
  });

  return mapAssessment(row);
}

async function getPatientHeartRiskAssessmentById({ patientId, assessmentId }) {
  const row = await prisma.patientHeartRiskAssessment.findFirst({
    where: {
      patientId,
      assessmentId,
    },
  });

  return mapAssessment(row);
}

async function listPatientHeartRiskAssessments({ patientId, startDate, endDate }) {
  const where = { patientId };

  if (startDate || endDate) {
    where.assessmentDate = {};
    if (startDate) {
      where.assessmentDate.gte = toDateOnly(startDate);
    }
    if (endDate) {
      where.assessmentDate.lte = toDateOnly(endDate);
    }
  }

  const rows = await prisma.patientHeartRiskAssessment.findMany({
    where,
    orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
  });

  return rows.map(mapAssessment);
}

async function createPatientHeartRiskAssessment({ patientId, actorUserId, payload }) {
  const parsedDate = toDateOnly(payload.assessmentDate);
  const { assessmentDate: _ignored, ...dataToSave } = payload;

  const row = await prisma.patientHeartRiskAssessment.upsert({
    where: {
      patientId_assessmentDate: {
        patientId,
        assessmentDate: parsedDate,
      },
    },
    update: {
      ...dataToSave,
      updatedByUserId: actorUserId,
      updatedAt: new Date(),
    },
    create: {
      patientId,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      assessmentDate: parsedDate,
      ...dataToSave,
    },
  });

  return mapAssessment(row);
}

async function updatePatientHeartRiskAssessment({ patientId, assessmentId, actorUserId, payload }) {
  const existing = await prisma.patientHeartRiskAssessment.findFirst({
    where: {
      patientId,
      assessmentId,
    },
  });

  if (!existing) {
    return null;
  }

  const data = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      data[key] = key === 'assessmentDate' ? toDateOnly(value) : value;
    }
  }

  data.updatedAt = new Date();
  data.updatedByUserId = actorUserId;

  const row = await prisma.patientHeartRiskAssessment.update({
    where: { assessmentId },
    data,
  });

  return mapAssessment(row);
}

async function getPatientHeartRiskSnapshot({ userId }) {
  const user = await prisma.user.findUnique({
    where: { userId },
    include: {
      patientProfile: true,
      patientHeartRiskAssessments: {
        orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
        take: 1,
      },
      heartDiaries: {
        orderBy: [{ diaryDate: 'desc' }, { createdAt: 'desc' }],
        take: 1,
        include: {
          bodyMetrics: {
            orderBy: [{ timeStamp: 'desc' }],
            take: 1,
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId,
    patientProfile: user.patientProfile,
    latestAssessment: mapAssessment(user.patientHeartRiskAssessments?.[0] || null),
    latestBodyMetric: user.heartDiaries?.[0]?.bodyMetrics?.[0]
      ? {
          systolicPressure: user.heartDiaries[0].bodyMetrics[0].systolicPressure,
          heartRate: user.heartDiaries[0].bodyMetrics[0].heartRate,
          measuredAt: user.heartDiaries[0].bodyMetrics[0].timeStamp?.toISOString() || null,
        }
      : null,
  };
}

module.exports = {
  getLatestPatientHeartRiskAssessment,
  getPatientHeartRiskAssessmentById,
  listPatientHeartRiskAssessments,
  createPatientHeartRiskAssessment,
  updatePatientHeartRiskAssessment,
  getPatientHeartRiskSnapshot,
};
