const { BAD_REQUEST, FORBIDDEN, NOT_FOUND } = require('../constants/httpStatus');
const biometricRepository = require('../repositories/biometricRepository');
const doctorPatientRepository = require('../repositories/doctorPatientRepository');
const profileRepository = require('../repositories/profileRepository');
const { normalizePaginationInput } = require('../utils/pagination');

const METRIC_ALIASES = {
  heart_rate: 'heart_rate',
  heartrate: 'heart_rate',
  hr: 'heart_rate',
  pulse: 'heart_rate',
  oxygen_saturation: 'oxygen_saturation',
  oxygen: 'oxygen_saturation',
  spo2: 'oxygen_saturation',
  sp02: 'oxygen_saturation',
  systolic: 'systolic_bp',
  systolic_bp: 'systolic_bp',
  systolic_pressure: 'systolic_bp',
  diastolic: 'diastolic_bp',
  diastolic_bp: 'diastolic_bp',
  diastolic_pressure: 'diastolic_bp',
  weight: 'weight',
  body_weight: 'weight',
  height: 'height',
  body_height: 'height',
  bmi: 'bmi',
};

function toIso(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMetricType(metricType) {
  const key = String(metricType || '')
    .trim()
    .toLowerCase();
  return METRIC_ALIASES[key] || null;
}

function buildPagination({ page, limit, totalItems }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    page,
    limit,
    totalItems,
    totalPages,
  };
}

async function assertPatientExists(patientId) {
  const profile = await profileRepository.getPatientProfileById(patientId);
  if (!profile) {
    const error = new Error('Pasien tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }
}

async function resolveTargetPatientId({ actor, patientId, requirePatientIdForPrivileged = false }) {
  if (!actor) {
    const error = new Error('Aktor tidak valid');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  const requestedPatientId = patientId || null;

  if (actor.role === 'patient') {
    if (requestedPatientId && requestedPatientId !== actor.userId) {
      const error = new Error('Pasien hanya boleh mengakses data miliknya sendiri');
      error.statusCode = FORBIDDEN;
      throw error;
    }

    return actor.userId;
  }

  if (actor.role === 'doctor') {
    if (!requestedPatientId) {
      const error = new Error('Dokter wajib mengirim patientId');
      error.statusCode = BAD_REQUEST;
      throw error;
    }

    const link = await doctorPatientRepository.findDoctorPatientLink({
      doctorId: actor.userId,
      patientId: requestedPatientId,
    });

    if (!link) {
      const error = new Error('Dokter tidak memiliki akses ke pasien ini');
      error.statusCode = FORBIDDEN;
      throw error;
    }

    return requestedPatientId;
  }

  if (actor.role === 'admin') {
    if (!requestedPatientId && requirePatientIdForPrivileged) {
      const error = new Error('Admin wajib mengirim patientId');
      error.statusCode = BAD_REQUEST;
      throw error;
    }

    return requestedPatientId || actor.userId;
  }

  const error = new Error('Role tidak memiliki akses endpoint biometrik');
  error.statusCode = FORBIDDEN;
  throw error;
}

async function ingestBiometrics({ actor, payload }) {
  const targetPatientId = await resolveTargetPatientId({
    actor,
    patientId: payload.patientId,
    requirePatientIdForPrivileged: true,
  });

  await assertPatientExists(targetPatientId);

  const source = String(payload.source || '')
    .trim()
    .toLowerCase();
  const results = [];
  let insertedCount = 0;
  let duplicateCount = 0;

  for (const reading of payload.readings) {
    const metricType = normalizeMetricType(reading.metricType);
    if (!metricType) {
      const error = new Error(`metricType tidak didukung: ${reading.metricType}`);
      error.statusCode = BAD_REQUEST;
      throw error;
    }

    const measuredAt = toIso(reading.measuredAt);
    if (!measuredAt) {
      const error = new Error(`measuredAt tidak valid untuk metricType ${reading.metricType}`);
      error.statusCode = BAD_REQUEST;
      throw error;
    }

    const valueNumeric = toNumberOrNull(reading.valueNumeric);
    const unit = reading.unit ? String(reading.unit).trim() : null;
    const payloadJson =
      reading.payload && typeof reading.payload === 'object' ? reading.payload : null;

    const duplicate = await biometricRepository.findDuplicateReading({
      userId: targetPatientId,
      source,
      metricType,
      measuredAt,
      valueNumeric,
      unit,
    });

    if (duplicate) {
      duplicateCount += 1;
      results.push({
        readingId: duplicate.reading_id,
        metricType,
        measuredAt: toIso(duplicate.measured_at),
        valueNumeric: toNumberOrNull(duplicate.value_numeric),
        unit: duplicate.unit || null,
        duplicate: true,
      });
      continue;
    }

    const created = await biometricRepository.insertReading({
      userId: targetPatientId,
      source,
      metricType,
      valueNumeric,
      unit,
      payload: payloadJson,
      measuredAt,
    });

    insertedCount += 1;
    results.push({
      readingId: created.reading_id,
      metricType,
      measuredAt: toIso(created.measured_at),
      valueNumeric: toNumberOrNull(created.value_numeric),
      unit: created.unit || null,
      duplicate: false,
    });
  }

  return {
    patientId: targetPatientId,
    source,
    totalReceived: payload.readings.length,
    insertedCount,
    duplicateCount,
    items: results,
  };
}

async function listBiometrics({ actor, query }) {
  const targetPatientId = await resolveTargetPatientId({
    actor,
    patientId: query.patientId,
    requirePatientIdForPrivileged: true,
  });

  await assertPatientExists(targetPatientId);

  const metricType = query.metricType ? normalizeMetricType(query.metricType) : null;
  if (query.metricType && !metricType) {
    const error = new Error(`metricType tidak didukung: ${query.metricType}`);
    error.statusCode = BAD_REQUEST;
    throw error;
  }

  const startAt = query.startAt ? toIso(query.startAt) : null;
  const endAt = query.endAt ? toIso(query.endAt) : null;

  if (query.startAt && !startAt) {
    const error = new Error('startAt tidak valid');
    error.statusCode = BAD_REQUEST;
    throw error;
  }

  if (query.endAt && !endAt) {
    const error = new Error('endAt tidak valid');
    error.statusCode = BAD_REQUEST;
    throw error;
  }

  if (startAt && endAt && new Date(startAt).getTime() > new Date(endAt).getTime()) {
    const error = new Error('startAt tidak boleh lebih besar dari endAt');
    error.statusCode = BAD_REQUEST;
    throw error;
  }

  const pagination = normalizePaginationInput(query, { limit: 50 });
  const offset = (pagination.page - 1) * pagination.limit;

  const source = query.source ? String(query.source).trim().toLowerCase() : null;

  const [rows, totalItems] = await Promise.all([
    biometricRepository.listReadings({
      userId: targetPatientId,
      source,
      metricType,
      startAt,
      endAt,
      limit: pagination.limit,
      offset,
    }),
    biometricRepository.countReadings({
      userId: targetPatientId,
      source,
      metricType,
      startAt,
      endAt,
    }),
  ]);

  return {
    patientId: targetPatientId,
    filters: {
      source,
      metricType,
      startAt,
      endAt,
    },
    items: rows.map((row) => ({
      readingId: row.reading_id,
      source: row.source,
      metricType: row.metric_type,
      valueNumeric: toNumberOrNull(row.value_numeric),
      unit: row.unit || null,
      payload: row.payload || null,
      measuredAt: toIso(row.measured_at),
      receivedAt: toIso(row.received_at),
    })),
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
    }),
  };
}

module.exports = {
  ingestBiometrics,
  listBiometrics,
};
