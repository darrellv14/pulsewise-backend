const prisma = require('../config/prisma');

function toNullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

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

function mapMlProfile(row) {
  if (!row) {
    return null;
  }

  return {
    patientId: row.patientId,
    demog1_riagendr: row.demog1Riagendr,
    demog1_ridreth3: row.demog1Ridreth3,
    demog1_dmdeduc: row.demog1Dmdeduc,
    demog1_dmdfmsiz: row.demog1Dmdfmsiz,
    demog1_dmdhhsiz: row.demog1Dmdhhsiz,
    demog1_dmdhhsza: row.demog1Dmdhhsza,
    demog1_dmdhhszb: row.demog1Dmdhhszb,
    demog1_dmdhhsze: row.demog1Dmdhhsze,
    demog1_dmdmartl: row.demog1Dmdmartl,
    quest22_smq020: row.quest22Smq020,
    quest22_smq890: row.quest22Smq890,
    quest22_smq900: row.quest22Smq900,
    quest23_smd470: row.quest23Smd470,
    quest1_alq111: row.quest1Alq111,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMlAssessment(row) {
  if (!row) {
    return null;
  }

  return {
    assessmentId: row.assessmentId,
    patientId: row.patientId,
    assessmentDate: row.assessmentDate,
    exami1_bpxpls: row.exami1Bpxpls,
    labor1_lbdtcsi: toNullableNumber(row.labor1Lbdtcsi),
    labor2_urdflow1: toNullableNumber(row.labor2Urdflow1),
    labor2_urdtime1: toNullableNumber(row.labor2Urdtime1),
    labor2_urxvol1: toNullableNumber(row.labor2Urxvol1),
    quest11_hiq011: row.quest11Hiq011,
    quest12_heq010: row.quest12Heq010,
    quest12_heq030: row.quest12Heq030,
    quest15_kiq022: row.quest15Kiq022,
    quest15_kiq026: row.quest15Kiq026,
    quest16_mcq010: row.quest16Mcq010,
    quest16_mcq160b: row.quest16Mcq160b,
    quest16_mcq220: row.quest16Mcq220,
    quest16_mcq300a: row.quest16Mcq300a,
    quest16_mcq300c: row.quest16Mcq300c,
    quest17_dpq020: row.quest17Dpq020,
    quest17_dpq030: row.quest17Dpq030,
    quest17_dpq040: row.quest17Dpq040,
    quest20_pfq061b: row.quest20Pfq061b,
    quest20_pfq061c: row.quest20Pfq061c,
    quest20_pfq061h: row.quest20Pfq061h,
    quest3_cdq009: row.quest3Cdq009,
    quest3_cdq010: row.quest3Cdq010,
    quest7_diq010: row.quest7Diq010,
    quest9_dlq050: row.quest9Dlq050,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getPatientMlProfileById(patientId) {
  const row = await prisma.patientMlProfile.findUnique({
    where: {
      patientId,
    },
  });

  return mapMlProfile(row);
}

async function upsertPatientMlProfile({ patientId, payload }) {
  const data = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      data[key] = value;
    }
  }

  const row = await prisma.patientMlProfile.upsert({
    where: {
      patientId,
    },
    create: {
      patientId,
      ...data,
    },
    update: {
      ...data,
      updatedAt: new Date(),
    },
  });

  return mapMlProfile(row);
}

async function getLatestPatientMlAssessment(patientId) {
  const row = await prisma.patientMlAssessment.findFirst({
    where: {
      patientId,
    },
    orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
  });

  return mapMlAssessment(row);
}

async function listPatientMlAssessments({ patientId, startDate, endDate }) {
  const where = {
    patientId,
  };

  if (startDate || endDate) {
    where.assessmentDate = {};
    if (startDate) {
      where.assessmentDate.gte = toDateOnly(startDate);
    }
    if (endDate) {
      where.assessmentDate.lte = toDateOnly(endDate);
    }
  }

  const rows = await prisma.patientMlAssessment.findMany({
    where,
    orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
  });

  return rows.map(mapMlAssessment);
}

// async function createPatientMlAssessment({ patientId, payload }) {
//   const row = await prisma.patientMlAssessment.create({
//     data: {
//       patientId,
//       ...payload,
//       assessmentDate: toDateOnly(payload.assessmentDate),
//     },
//   });

//   return mapMlAssessment(row);
// }

async function createPatientMlAssessment({ patientId, payload }) {
  const parsedDate = toDateOnly(payload.assessmentDate);
  const { assessmentDate: _ignored, ...dataToSave } = payload;
  const row = await prisma.patientMlAssessment.upsert({
    where: {
      patientId_assessmentDate: {
        patientId: patientId,
        assessmentDate: parsedDate,
      },
    },
    update: {
      ...dataToSave,
      updatedAt: new Date(),
    },
    create: {
      patientId: patientId,
      assessmentDate: parsedDate,
      ...dataToSave,
    },
  });

  return mapMlAssessment(row);
}

async function updatePatientMlAssessment({ patientId, assessmentId, payload }) {
  const existing = await prisma.patientMlAssessment.findFirst({
    where: {
      assessmentId,
      patientId,
    },
  });

  if (!existing) {
    return null;
  }

  const data = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      data[key] = value;
    }
  }

  if (data.assessmentDate !== undefined) {
    data.assessmentDate = toDateOnly(data.assessmentDate);
  }

  data.updatedAt = new Date();

  const row = await prisma.patientMlAssessment.update({
    where: {
      assessmentId,
    },
    data,
  });

  return mapMlAssessment(row);
}

module.exports = {
  getPatientMlProfileById,
  upsertPatientMlProfile,
  getLatestPatientMlAssessment,
  listPatientMlAssessments,
  createPatientMlAssessment,
  updatePatientMlAssessment,
};
