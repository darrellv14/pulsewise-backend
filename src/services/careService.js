const crypto = require('crypto');
const { NOT_FOUND, FORBIDDEN } = require('../constants/httpStatus');
const profileRepository = require('../repositories/profileRepository');
const doctorPatientRepository = require('../repositories/doctorPatientRepository');
const dashboardRepository = require('../repositories/dashboardRepository');
const patientShareRepository = require('../repositories/patientShareRepository');
const patientMlRepository = require('../repositories/patientMlRepository');
const dashboardPairingService = require('./dashboardPairingService');
const thresholds = require('../constants/dashboardThresholds');
const { normalizePaginationInput } = require('../utils/pagination');

function buildPagination({ page, limit, totalItems }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    page,
    limit,
    totalItems,
    totalPages,
  };
}

function toNumberOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIso(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toDateOnlyIso(value) {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function calculateAge(dateOfBirth) {
  const dobIso = toDateOnlyIso(dateOfBirth);
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

function latestIso(...values) {
  const normalized = values.map((value) => toIso(value)).filter(Boolean);
  if (!normalized.length) {
    return null;
  }

  return normalized.reduce((max, value) => (value > max ? value : max));
}

function normalizeMetricType(metricType) {
  const normalized = String(metricType || '').toLowerCase();

  if (['heart_rate', 'heartrate', 'hr', 'pulse'].includes(normalized)) {
    return 'heartRate';
  }
  if (['oxygen_saturation', 'spo2', 'sp02', 'oxygen'].includes(normalized)) {
    return 'oxygenSaturation';
  }
  if (['systolic_bp', 'systolic_pressure', 'systolic'].includes(normalized)) {
    return 'systolicBp';
  }
  if (['diastolic_bp', 'diastolic_pressure', 'diastolic'].includes(normalized)) {
    return 'diastolicBp';
  }
  if (['weight', 'body_weight'].includes(normalized)) {
    return 'weight';
  }
  if (['height', 'body_height'].includes(normalized)) {
    return 'height';
  }
  if (normalized === 'bmi') {
    return 'bmi';
  }

  return null;
}

function assertDoctorScope({ actor, doctorId }) {
  if (!actor) {
    const error = new Error('Aktor tidak valid');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'doctor') {
    const error = new Error('Role tidak memiliki akses dashboard dokter');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  if (actor.userId !== doctorId) {
    const error = new Error('Akses dashboard dokter ditolak');
    error.statusCode = FORBIDDEN;
    throw error;
  }
}

function assertPatientScope({ actor, patientId }) {
  if (!actor) {
    const error = new Error('Aktor tidak valid');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'patient') {
    const error = new Error('Role tidak memiliki akses pasien');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  if (actor.userId !== patientId) {
    const error = new Error('Akses data pasien ditolak');
    error.statusCode = FORBIDDEN;
    throw error;
  }
}

async function assertPatientResourceAccess({ actor, patientId }) {
  if (!actor) {
    const error = new Error('Aktor tidak valid');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.role === 'patient') {
    if (actor.userId !== patientId) {
      const error = new Error('Akses data pasien ditolak');
      error.statusCode = FORBIDDEN;
      throw error;
    }

    return;
  }

  if (actor.role === 'doctor') {
    const link = await doctorPatientRepository.findDoctorPatientLink({
      doctorId: actor.userId,
      patientId,
    });

    if (!link) {
      const error = new Error('Dokter tidak memiliki akses ke pasien ini');
      error.statusCode = FORBIDDEN;
      throw error;
    }

    return;
  }

  const error = new Error('Role tidak memiliki akses pasien');
  error.statusCode = FORBIDDEN;
  throw error;
}

function generateShareCode() {
  return `PW-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function buildPeriodRange({ startDate, endDate, timePeriod = 'last_30_days' }) {
  const now = new Date();

  if (startDate && endDate) {
    const startAt = new Date(startDate);
    const endAt = new Date(endDate);

    startAt.setUTCHours(0, 0, 0, 0);
    endAt.setUTCHours(23, 59, 59, 999);

    return {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      timePeriod: 'custom',
    };
  }

  const startAt = new Date(now);
  startAt.setUTCHours(0, 0, 0, 0);

  if (timePeriod === 'all') {
    startAt.setUTCFullYear(1970, 0, 1);
  } else if (timePeriod === 'last_7_days') {
    startAt.setUTCDate(startAt.getUTCDate() - 6);
  } else if (timePeriod === 'last_14_days') {
    startAt.setUTCDate(startAt.getUTCDate() - 13);
  } else if (timePeriod === 'last_30_days') {
    startAt.setUTCDate(startAt.getUTCDate() - 29);
  } else if (timePeriod === 'last_3_months') {
    startAt.setUTCMonth(startAt.getUTCMonth() - 3);
  } else if (timePeriod === 'last_6_months') {
    startAt.setUTCMonth(startAt.getUTCMonth() - 6);
  }

  return {
    startAt: startAt.toISOString(),
    endAt: now.toISOString(),
    timePeriod,
  };
}

function formatPatientIdentity(row) {
  const dateOfBirth = toDateOnlyIso(row.date_of_birth);

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

function createPoint(timestamp) {
  return {
    timestamp,
    systolicBp: null,
    diastolicBp: null,
    heartRate: null,
    oxygenSaturation: null,
    weight: null,
    height: null,
    bmi: null,
  };
}

function mergeSeries({ dailyRows, vitalRows }) {
  const byTimestamp = new Map();

  for (const row of dailyRows) {
    const timestamp = toIso(row.measured_at);
    if (!timestamp) {
      continue;
    }

    if (!byTimestamp.has(timestamp)) {
      byTimestamp.set(timestamp, createPoint(timestamp));
    }

    const point = byTimestamp.get(timestamp);
    point.systolicBp = toNumberOrNull(row.systolic_bp);
    point.diastolicBp = toNumberOrNull(row.diastolic_bp);
    point.weight = toNumberOrNull(row.weight);
    point.height = toNumberOrNull(row.height);
    point.bmi = toNumberOrNull(row.bmi);
  }

  for (const reading of vitalRows) {
    const timestamp = toIso(reading.measured_at);
    const metric = normalizeMetricType(reading.metric_type);

    if (!timestamp || !metric) {
      continue;
    }

    if (!byTimestamp.has(timestamp)) {
      byTimestamp.set(timestamp, createPoint(timestamp));
    }

    const point = byTimestamp.get(timestamp);
    point[metric] = toNumberOrNull(reading.value_numeric);
  }

  const points = Array.from(byTimestamp.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    points,
    series: {
      timestamps: points.map((point) => point.timestamp),
      systolicBp: points.map((point) => point.systolicBp),
      diastolicBp: points.map((point) => point.diastolicBp),
      heartRate: points.map((point) => point.heartRate),
      oxygenSaturation: points.map((point) => point.oxygenSaturation),
      weight: points.map((point) => point.weight),
      height: points.map((point) => point.height),
      bmi: points.map((point) => point.bmi),
    },
  };
}

function latestValue(points, key) {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i][key];
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  return null;
}

function buildLatestVitals(points) {
  return {
    measuredAt: points.length ? points[points.length - 1].timestamp : null,
    systolicBp: latestValue(points, 'systolicBp'),
    diastolicBp: latestValue(points, 'diastolicBp'),
    heartRate: latestValue(points, 'heartRate'),
    oxygenSaturation: latestValue(points, 'oxygenSaturation'),
    weight: latestValue(points, 'weight'),
    height: latestValue(points, 'height'),
    bmi: latestValue(points, 'bmi'),
  };
}

function extractNumberValues(points, key) {
  return points
    .map((point) => point[key])
    .filter((value) => value !== null && value !== undefined && Number.isFinite(value));
}

function aggregateStats(values) {
  if (!values.length) {
    return {
      avg: null,
      min: null,
      max: null,
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    avg: Math.round((total / values.length) * 10) / 10,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function buildAbnormalInstances(points) {
  const abnormalities = [];
  let previousWeight = null;

  for (const point of points) {
    const details = {};

    if (point.systolicBp !== null && point.diastolicBp !== null) {
      if (
        point.systolicBp >= thresholds.BP_STAGE2_SYSTOLIC_MIN ||
        point.diastolicBp >= thresholds.BP_STAGE2_DIASTOLIC_MIN
      ) {
        details.bloodPressure = `${point.systolicBp}/${point.diastolicBp} mmHg (Stage 2 Hypertension)`;
      } else if (
        (point.systolicBp >= thresholds.BP_STAGE1_SYSTOLIC_MIN &&
          point.systolicBp <= thresholds.BP_STAGE1_SYSTOLIC_MAX) ||
        (point.diastolicBp >= thresholds.BP_STAGE1_DIASTOLIC_MIN &&
          point.diastolicBp <= thresholds.BP_STAGE1_DIASTOLIC_MAX)
      ) {
        details.bloodPressure = `${point.systolicBp}/${point.diastolicBp} mmHg (Stage 1 Hypertension)`;
      } else if (
        point.systolicBp >= thresholds.BP_ELEVATED_SYSTOLIC_MIN &&
        point.systolicBp <= thresholds.BP_ELEVATED_SYSTOLIC_MAX &&
        point.diastolicBp < thresholds.BP_ELEVATED_DIASTOLIC_MAX
      ) {
        details.bloodPressure = `${point.systolicBp}/${point.diastolicBp} mmHg (Elevated)`;
      }
    }

    if (point.heartRate !== null) {
      if (
        point.heartRate > thresholds.HR_NORMAL_MAX ||
        point.heartRate < thresholds.HR_NORMAL_MIN
      ) {
        details.heartRate = `${point.heartRate} bpm (Outside of Normal Range)`;
      }
    }

    if (point.oxygenSaturation !== null) {
      if (point.oxygenSaturation < thresholds.SPO2_CRITICAL_THRESHOLD) {
        details.oxygenSaturation = `${point.oxygenSaturation}% (Dangerous)`;
      } else if (point.oxygenSaturation < thresholds.SPO2_CAUTION_THRESHOLD) {
        details.oxygenSaturation = `${point.oxygenSaturation}% (Caution)`;
      }
    }

    if (point.weight !== null && previousWeight !== null) {
      const weightDiff = point.weight - previousWeight;
      if (Math.abs(weightDiff) > thresholds.WEIGHT_DAILY_INCREASE_CRITICAL_KG) {
        details.weightChange = `${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(2)} kg from previous reading (Significant Change)`;
      }
    }

    if (point.weight !== null) {
      previousWeight = point.weight;
    }

    if (Object.keys(details).length > 0) {
      abnormalities.push({
        timestamp: point.timestamp,
        details,
      });
    }
  }

  return abnormalities;
}

async function listPatients({ page, limit, sortBy, order }) {
  const pagination = normalizePaginationInput({ page, limit });
  const offset = (pagination.page - 1) * pagination.limit;
  const result = await profileRepository.listPatientProfiles({
    limit: pagination.limit,
    offset,
    sortBy,
    order,
  });

  return {
    items: result.items,
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      totalItems: result.totalItems,
    }),
  };
}

async function getPatientProfile(patientId) {
  const profile = await profileRepository.getPatientProfileById(patientId);
  if (!profile) {
    const error = new Error('Profil pasien tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  return profile;
}

async function updatePatientProfile(patientId, payload) {
  return profileRepository.upsertPatientProfile({
    patientId,
    dateOfBirth: payload.dateOfBirth !== undefined ? payload.dateOfBirth : undefined,
    sex: payload.sex !== undefined ? payload.sex : undefined,
    bodyHeightCm: payload.heightCm !== undefined ? payload.heightCm : undefined,
    isSmoking: payload.isSmoking !== undefined ? payload.isSmoking : undefined,
    isElectricSmoking:
      payload.isElectricSmoking !== undefined ? payload.isElectricSmoking : undefined,
    bloodType: payload.bloodType !== undefined ? payload.bloodType : undefined,
    address: payload.address !== undefined ? payload.address : undefined,
  });
}

async function getPatientMlProfile({ actor, patientId }) {
  await assertPatientResourceAccess({ actor, patientId });

  const profile = await patientMlRepository.getPatientMlProfileById(patientId);
  if (!profile) {
    const error = new Error('ML profile pasien tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  return profile;
}

async function updatePatientMlProfile({ actor, patientId, payload }) {
  await assertPatientResourceAccess({ actor, patientId });

  return patientMlRepository.upsertPatientMlProfile({
    patientId,
    payload: {
      demog1Riagendr: payload.demog1_riagendr,
      demog1Ridreth3: payload.demog1_ridreth3,
      demog1Dmdeduc: payload.demog1_dmdeduc,
      demog1Dmdfmsiz: payload.demog1_dmdfmsiz,
      demog1Dmdhhsiz: payload.demog1_dmdhhsiz,
      demog1Dmdhhsza: payload.demog1_dmdhhsza,
      demog1Dmdhhszb: payload.demog1_dmdhhszb,
      demog1Dmdhhsze: payload.demog1_dmdhhsze,
      demog1Dmdmartl: payload.demog1_dmdmartl,
      quest22Smq020: payload.quest22_smq020,
      quest22Smq890: payload.quest22_smq890,
      quest22Smq900: payload.quest22_smq900,
      quest23Smd470: payload.quest23_smd470,
      quest1Alq111: payload.quest1_alq111,
    },
  });
}

async function getLatestPatientMlAssessment({ actor, patientId }) {
  await assertPatientResourceAccess({ actor, patientId });

  const assessment = await patientMlRepository.getLatestPatientMlAssessment(patientId);
  if (!assessment) {
    const error = new Error('Assessment ML pasien tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  return assessment;
}

async function listPatientMlAssessments({ actor, patientId, query }) {
  await assertPatientResourceAccess({ actor, patientId });

  const items = await patientMlRepository.listPatientMlAssessments({
    patientId,
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return {
    items,
  };
}

async function createPatientMlAssessment({ actor, patientId, payload }) {
  await assertPatientResourceAccess({ actor, patientId });

  return patientMlRepository.createPatientMlAssessment({
    patientId,
    payload: {
      assessmentDate: payload.assessmentDate,
      exami1Bpxpls: payload.exami1_bpxpls,
      labor1Lbdtcsi: payload.labor1_lbdtcsi,
      labor2Urdflow1: payload.labor2_urdflow1,
      labor2Urdtime1: payload.labor2_urdtime1,
      labor2Urxvol1: payload.labor2_urxvol1,
      quest11Hiq011: payload.quest11_hiq011,
      quest12Heq010: payload.quest12_heq010,
      quest12Heq030: payload.quest12_heq030,
      quest15Kiq022: payload.quest15_kiq022,
      quest15Kiq026: payload.quest15_kiq026,
      quest16Mcq010: payload.quest16_mcq010,
      quest16Mcq160b: payload.quest16_mcq160b,
      quest16Mcq220: payload.quest16_mcq220,
      quest16Mcq300a: payload.quest16_mcq300a,
      quest16Mcq300c: payload.quest16_mcq300c,
      quest17Dpq020: payload.quest17_dpq020,
      quest17Dpq030: payload.quest17_dpq030,
      quest17Dpq040: payload.quest17_dpq040,
      quest20Pfq061b: payload.quest20_pfq061b,
      quest20Pfq061c: payload.quest20_pfq061c,
      quest20Pfq061h: payload.quest20_pfq061h,
      quest3Cdq009: payload.quest3_cdq009,
      quest3Cdq010: payload.quest3_cdq010,
      quest7Diq010: payload.quest7_diq010,
      quest9Dlq050: payload.quest9_dlq050,
    },
  });
}

async function updatePatientMlAssessment({ actor, patientId, assessmentId, payload }) {
  await assertPatientResourceAccess({ actor, patientId });

  const assessment = await patientMlRepository.updatePatientMlAssessment({
    patientId,
    assessmentId,
    payload: {
      assessmentDate: payload.assessmentDate,
      exami1Bpxpls: payload.exami1_bpxpls,
      labor1Lbdtcsi: payload.labor1_lbdtcsi,
      labor2Urdflow1: payload.labor2_urdflow1,
      labor2Urdtime1: payload.labor2_urdtime1,
      labor2Urxvol1: payload.labor2_urxvol1,
      quest11Hiq011: payload.quest11_hiq011,
      quest12Heq010: payload.quest12_heq010,
      quest12Heq030: payload.quest12_heq030,
      quest15Kiq022: payload.quest15_kiq022,
      quest15Kiq026: payload.quest15_kiq026,
      quest16Mcq010: payload.quest16_mcq010,
      quest16Mcq160b: payload.quest16_mcq160b,
      quest16Mcq220: payload.quest16_mcq220,
      quest16Mcq300a: payload.quest16_mcq300a,
      quest16Mcq300c: payload.quest16_mcq300c,
      quest17Dpq020: payload.quest17_dpq020,
      quest17Dpq030: payload.quest17_dpq030,
      quest17Dpq040: payload.quest17_dpq040,
      quest20Pfq061b: payload.quest20_pfq061b,
      quest20Pfq061c: payload.quest20_pfq061c,
      quest20Pfq061h: payload.quest20_pfq061h,
      quest3Cdq009: payload.quest3_cdq009,
      quest3Cdq010: payload.quest3_cdq010,
      quest7Diq010: payload.quest7_diq010,
      quest9Dlq050: payload.quest9_dlq050,
    },
  });

  if (!assessment) {
    const error = new Error('Assessment ML pasien tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  return assessment;
}

async function getDoctorProfile(doctorId) {
  const profile = await profileRepository.getDoctorProfileById(doctorId);
  if (!profile) {
    const error = new Error('Profil dokter tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  return profile;
}

async function updateDoctorProfile(doctorId, payload) {
  return profileRepository.upsertDoctorProfile({
    doctorId,
    specialization: payload.specialization || null,
    licenseNo: payload.licenseNo || null,
    hospitalName: payload.hospitalName || null,
  });
}

async function listDoctorPatients({ doctorId, page, limit }) {
  const pagination = normalizePaginationInput({ page, limit });
  const offset = (pagination.page - 1) * pagination.limit;
  const result = await doctorPatientRepository.listDoctorPatients({
    doctorId,
    limit: pagination.limit,
    offset,
  });

  return {
    items: result.items,
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      totalItems: result.totalItems,
    }),
  };
}

async function linkDoctorPatient({ doctorId, patientId, source }) {
  return doctorPatientRepository.upsertDoctorPatientLink({ doctorId, patientId, source });
}

async function createPatientShare({ actor, patientId, expiresInHours = 24 }) {
  assertPatientScope({ actor, patientId });

  const shareCode = generateShareCode();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const share = await patientShareRepository.createPatientShare({
    patientId,
    shareCode,
    expiresAt,
    createdBy: actor.userId,
  });

  return {
    shareId: share.share_id,
    patientId: share.patient_id,
    shareCode: share.share_code,
    expiresAt: toIso(share.expires_at),
    qrPayload: share.share_code,
  };
}

async function linkDoctorPatientByShareCode({ actor, doctorId, shareCode }) {
  assertDoctorScope({ actor, doctorId });

  const normalizedCode = String(shareCode || '')
    .trim()
    .toUpperCase();
  const share = await patientShareRepository.findActiveShareByCode(normalizedCode);
  if (!share) {
    const error = new Error('Share code tidak valid atau sudah kadaluarsa');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  const linked = await doctorPatientRepository.upsertDoctorPatientLink({
    doctorId,
    patientId: share.patient_id,
    source: 'qr',
  });

  await patientShareRepository.revokeShare(share.share_id);

  return {
    ...linked,
    linkedByShareCode: normalizedCode,
  };
}

async function linkDoctorPatientByPatientId({
  actor,
  doctorId,
  patientId,
  source = 'qr_patient_id',
}) {
  assertDoctorScope({ actor, doctorId });

  return doctorPatientRepository.upsertDoctorPatientLink({
    doctorId,
    patientId,
    source,
  });
}

async function createDashboardPairingSession({ actor, doctorId, expiresInSeconds = 90 }) {
  return dashboardPairingService.createDashboardPairingSession({
    actor,
    doctorId,
    expiresInSeconds,
  });
}

async function getDashboardPairingSessionStatus({ actor, doctorId, pairingSessionId }) {
  return dashboardPairingService.getDashboardPairingSessionStatus({
    actor,
    doctorId,
    pairingSessionId,
  });
}

async function confirmDashboardPairingSession({
  actor,
  pairingToken,
  source = 'qr_dashboard_pairing',
}) {
  return dashboardPairingService.confirmDashboardPairingSession({
    actor,
    pairingToken,
    source,
  });
}

async function unlinkDoctorPatient({ doctorId, patientId }) {
  const link = await doctorPatientRepository.deactivateDoctorPatientLink({ doctorId, patientId });

  if (!link) {
    const error = new Error('Relasi dokter-pasien tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  return link;
}

async function listDoctorDashboardPatients({ actor, doctorId, query }) {
  assertDoctorScope({ actor, doctorId });

  const pagination = normalizePaginationInput(query);
  const offset = (pagination.page - 1) * pagination.limit;

  const result = await dashboardRepository.listDoctorDashboardPatients({
    doctorId,
    q: query.q,
    limit: pagination.limit,
    offset,
  });

  return {
    items: result.items.map((item) => ({
      patientId: item.patient_id,
      firstName: item.first_name,
      lastName: item.last_name,
      email: item.email,
      dateOfBirth: toDateOnlyIso(item.date_of_birth),
      age: calculateAge(item.date_of_birth),
      sex: item.sex || null,
      latestVitals: {
        measuredAt: latestIso(
          item.latest_measured_at,
          item.latest_heart_rate_measured_at,
          item.latest_oxygen_saturation_measured_at
        ),
        systolicBp: toNumberOrNull(item.latest_systolic_bp),
        diastolicBp: toNumberOrNull(item.latest_diastolic_bp),
        heartRate: toNumberOrNull(item.latest_heart_rate),
        oxygenSaturation: toNumberOrNull(item.latest_oxygen_saturation),
        weight: toNumberOrNull(item.latest_weight),
        height: toNumberOrNull(item.latest_height),
        bmi: toNumberOrNull(item.latest_bmi),
      },
    })),
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      totalItems: result.totalItems,
    }),
  };
}

async function getDoctorDashboardPatientSummary({ actor, doctorId, patientId }) {
  assertDoctorScope({ actor, doctorId });

  const identity = await dashboardRepository.getDoctorPatientIdentity({ doctorId, patientId });
  if (!identity) {
    const error = new Error('Data pasien dokter tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  const [latestDaily, latestVitalSnapshot] = await Promise.all([
    dashboardRepository.getLatestDailyMetrics(patientId),
    dashboardRepository.getLatestVitalSnapshot(patientId),
  ]);

  const latestVitals = {
    measuredAt: toIso(latestDaily?.measured_at),
    systolicBp: toNumberOrNull(latestDaily?.systolic_bp),
    diastolicBp: toNumberOrNull(latestDaily?.diastolic_bp),
    heartRate: null,
    oxygenSaturation: null,
    weight: toNumberOrNull(latestDaily?.weight),
    height: toNumberOrNull(latestDaily?.height),
    bmi: toNumberOrNull(latestDaily?.bmi),
  };

  for (const reading of latestVitalSnapshot) {
    const key = normalizeMetricType(reading.metric_type);
    if (!key) {
      continue;
    }

    latestVitals[key] = toNumberOrNull(reading.value_numeric);

    const measuredAt = toIso(reading.measured_at);
    if (!latestVitals.measuredAt || (measuredAt && measuredAt > latestVitals.measuredAt)) {
      latestVitals.measuredAt = measuredAt;
    }
  }

  return {
    patient: formatPatientIdentity(identity),
    latestVitals,
    thresholds,
  };
}

async function getDoctorDashboardPatientVitals({ actor, doctorId, patientId, query }) {
  assertDoctorScope({ actor, doctorId });

  const identity = await dashboardRepository.getDoctorPatientIdentity({ doctorId, patientId });
  if (!identity) {
    const error = new Error('Data pasien dokter tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  const period = buildPeriodRange(query);

  const [dailyRows, vitalRows] = await Promise.all([
    dashboardRepository.listDailyMetricsSeries({
      patientId,
      startAt: period.startAt,
      endAt: period.endAt,
    }),
    dashboardRepository.listVitalReadingSeries({
      patientId,
      startAt: period.startAt,
      endAt: period.endAt,
    }),
  ]);

  const merged = mergeSeries({ dailyRows, vitalRows });

  return {
    patient: formatPatientIdentity(identity),
    period,
    series: merged.series,
    latestVitals: buildLatestVitals(merged.points),
    thresholds,
  };
}

async function getDoctorDashboardAbnormalReport({ actor, doctorId, patientId, query }) {
  assertDoctorScope({ actor, doctorId });

  const identity = await dashboardRepository.getDoctorPatientIdentity({ doctorId, patientId });
  if (!identity) {
    const error = new Error('Data pasien dokter tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  const period = buildPeriodRange(query);

  const [dailyRows, vitalRows] = await Promise.all([
    dashboardRepository.listDailyMetricsSeries({
      patientId,
      startAt: period.startAt,
      endAt: period.endAt,
    }),
    dashboardRepository.listVitalReadingSeries({
      patientId,
      startAt: period.startAt,
      endAt: period.endAt,
    }),
  ]);

  const merged = mergeSeries({ dailyRows, vitalRows });

  const stats = {
    systolicBp: aggregateStats(extractNumberValues(merged.points, 'systolicBp')),
    diastolicBp: aggregateStats(extractNumberValues(merged.points, 'diastolicBp')),
    heartRate: aggregateStats(extractNumberValues(merged.points, 'heartRate')),
    oxygenSaturation: aggregateStats(extractNumberValues(merged.points, 'oxygenSaturation')),
    weight: aggregateStats(extractNumberValues(merged.points, 'weight')),
    bmi: aggregateStats(extractNumberValues(merged.points, 'bmi')),
  };

  return {
    patient: formatPatientIdentity(identity),
    period,
    stats,
    abnormalInstances: buildAbnormalInstances(merged.points),
    thresholds,
  };
}

module.exports = {
  listPatients,
  getPatientProfile,
  updatePatientProfile,
  getPatientMlProfile,
  updatePatientMlProfile,
  getLatestPatientMlAssessment,
  listPatientMlAssessments,
  createPatientMlAssessment,
  updatePatientMlAssessment,
  getDoctorProfile,
  updateDoctorProfile,
  listDoctorPatients,
  linkDoctorPatient,
  createPatientShare,
  linkDoctorPatientByShareCode,
  linkDoctorPatientByPatientId,
  createDashboardPairingSession,
  getDashboardPairingSessionStatus,
  confirmDashboardPairingSession,
  unlinkDoctorPatient,
  listDoctorDashboardPatients,
  getDoctorDashboardPatientSummary,
  getDoctorDashboardPatientVitals,
  getDoctorDashboardAbnormalReport,
};
