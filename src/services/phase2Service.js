const crypto = require('crypto');
const { NOT_FOUND, FORBIDDEN } = require('../constants/httpStatus');
const profileRepository = require('../repositories/profileRepository');
const doctorPatientRepository = require('../repositories/doctorPatientRepository');
const dashboardRepository = require('../repositories/dashboardRepository');
const dashboardPairingRepository = require('../repositories/dashboardPairingRepository');
const patientShareRepository = require('../repositories/patientShareRepository');
const thresholds = require('../constants/dashboardThresholds');

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

function generateShareCode() {
  return `PW-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function generateDashboardPairingToken() {
  return `PWDASH-${crypto.randomBytes(18).toString('hex').toUpperCase()}`;
}

function hashPairingToken(pairingToken) {
  return crypto.createHash('sha256').update(String(pairingToken || '').trim()).digest('hex');
}

function assertPatientActor(actor) {
  if (!actor) {
    const error = new Error('Aktor tidak valid');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  if (actor.role !== 'patient') {
    const error = new Error('Hanya pasien yang dapat mengonfirmasi pairing dashboard');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  return actor.userId;
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
  return {
    patientId: row.patient_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.tel_no || null,
    dateOfBirth: toDateOnlyIso(row.date_of_birth),
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
      if (point.heartRate > thresholds.HR_NORMAL_MAX || point.heartRate < thresholds.HR_NORMAL_MIN) {
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
  const offset = (page - 1) * limit;
  const result = await profileRepository.listPatientProfiles({ limit, offset, sortBy, order });

  return {
    items: result.items,
    pagination: buildPagination({ page, limit, totalItems: result.totalItems }),
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
    dateOfBirth: payload.dateOfBirth || null,
    sex: payload.sex || null,
  });
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
  const offset = (page - 1) * limit;
  const result = await doctorPatientRepository.listDoctorPatients({ doctorId, limit, offset });

  return {
    items: result.items,
    pagination: buildPagination({ page, limit, totalItems: result.totalItems }),
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

  const normalizedCode = String(shareCode || '').trim().toUpperCase();
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

async function linkDoctorPatientByPatientId({ actor, doctorId, patientId, source = 'qr_patient_id' }) {
  assertDoctorScope({ actor, doctorId });

  return doctorPatientRepository.upsertDoctorPatientLink({
    doctorId,
    patientId,
    source,
  });
}

async function createDashboardPairingSession({ actor, doctorId, expiresInSeconds = 90 }) {
  assertDoctorScope({ actor, doctorId });

  const pairingToken = generateDashboardPairingToken();
  const pairingTokenHash = hashPairingToken(pairingToken);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const pairingSession = await dashboardPairingRepository.createDashboardPairingSession({
    doctorId,
    pairingTokenHash,
    expiresAt,
  });

  return {
    pairingSessionId: pairingSession.pairing_session_id,
    doctorId: pairingSession.doctor_id,
    status: pairingSession.status,
    expiresAt: toIso(pairingSession.expires_at),
    pairingToken,
    qrPayload: pairingToken,
    pollingPath: `/api/v1/doctors/${doctorId}/dashboard/pairing-sessions/${pairingSession.pairing_session_id}`,
  };
}

async function getDashboardPairingSessionStatus({ actor, doctorId, pairingSessionId }) {
  assertDoctorScope({ actor, doctorId });

  let pairingSession = await dashboardPairingRepository.findDashboardPairingSessionById({
    doctorId,
    pairingSessionId,
  });

  if (!pairingSession) {
    const error = new Error('Session pairing dashboard tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  if (pairingSession.status === 'pending' && new Date(pairingSession.expires_at).getTime() <= Date.now()) {
    pairingSession =
      (await dashboardPairingRepository.markDashboardPairingSessionExpired(pairingSession.pairing_session_id)) ||
      pairingSession;
  }

  return {
    pairingSessionId: pairingSession.pairing_session_id,
    doctorId: pairingSession.doctor_id,
    status: pairingSession.status,
    expiresAt: toIso(pairingSession.expires_at),
    confirmedAt: toIso(pairingSession.confirmed_at),
    patientId: pairingSession.confirmed_by_patient_id || null,
  };
}

async function confirmDashboardPairingSession({ actor, pairingToken, source = 'qr_dashboard_pairing' }) {
  const patientId = assertPatientActor(actor);

  const pairingTokenHash = hashPairingToken(pairingToken);
  const pairingSession = await dashboardPairingRepository.findActiveDashboardPairingSessionByTokenHash(
    pairingTokenHash
  );

  if (!pairingSession) {
    const error = new Error('Pairing token tidak valid atau sudah kadaluarsa');
    error.statusCode = NOT_FOUND;
    throw error;
  }

  const linked = await doctorPatientRepository.upsertDoctorPatientLink({
    doctorId: pairingSession.doctor_id,
    patientId,
    source,
  });

  const confirmedSession = await dashboardPairingRepository.markDashboardPairingSessionConfirmed({
    pairingSessionId: pairingSession.pairing_session_id,
    patientId,
  });

  return {
    pairingSessionId: confirmedSession?.pairing_session_id || pairingSession.pairing_session_id,
    status: confirmedSession?.status || 'confirmed',
    doctorId: pairingSession.doctor_id,
    patientId,
    confirmedAt: toIso(confirmedSession?.confirmed_at),
    doctorPatientLink: linked,
  };
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

  const page = query.page;
  const limit = query.limit;
  const offset = (page - 1) * limit;

  const result = await dashboardRepository.listDoctorDashboardPatients({
    doctorId,
    q: query.q,
    limit,
    offset,
  });

  return {
    items: result.items.map((item) => ({
      patientId: item.patient_id,
      firstName: item.first_name,
      lastName: item.last_name,
      email: item.email,
      dateOfBirth: toDateOnlyIso(item.date_of_birth),
      sex: item.sex || null,
      latestVitals: {
        measuredAt: toIso(item.latest_measured_at),
        systolicBp: toNumberOrNull(item.latest_systolic_bp),
        diastolicBp: toNumberOrNull(item.latest_diastolic_bp),
        weight: toNumberOrNull(item.latest_weight),
        height: toNumberOrNull(item.latest_height),
        bmi: toNumberOrNull(item.latest_bmi),
      },
    })),
    pagination: buildPagination({ page, limit, totalItems: result.totalItems }),
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
