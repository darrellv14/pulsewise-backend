const crypto = require('crypto');
const { NOT_FOUND } = require('../../constants/httpStatus');
const {
  assertDoctorScope,
  assertPatientScope,
  assertPatientResourceAccess,
} = require('../shared/guards');

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

function buildLatestVitalField(value, measuredAt) {
  return {
    value: value !== undefined ? value : null,
    measuredAt: toIso(measuredAt),
  };
}


function generateShareCode() {
  return `PW-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
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

function latestValue(points, key) {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i][key];
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  return null;
}

function latestPointWithValue(points, key) {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i][key];
    if (value !== null && value !== undefined) {
      return points[i];
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

function buildLatestVitalsByField(points) {
  const systolicPoint = latestPointWithValue(points, 'systolicBp');
  const diastolicPoint = latestPointWithValue(points, 'diastolicBp');
  const heartRatePoint = latestPointWithValue(points, 'heartRate');
  const oxygenPoint = latestPointWithValue(points, 'oxygenSaturation');
  const weightPoint = latestPointWithValue(points, 'weight');
  const heightPoint = latestPointWithValue(points, 'height');
  const bmiPoint = latestPointWithValue(points, 'bmi');

  return {
    systolicBp: buildLatestVitalField(systolicPoint?.systolicBp ?? null, systolicPoint?.timestamp),
    diastolicBp: buildLatestVitalField(
      diastolicPoint?.diastolicBp ?? null,
      diastolicPoint?.timestamp
    ),
    heartRate: buildLatestVitalField(heartRatePoint?.heartRate ?? null, heartRatePoint?.timestamp),
    oxygenSaturation: buildLatestVitalField(
      oxygenPoint?.oxygenSaturation ?? null,
      oxygenPoint?.timestamp
    ),
    weight: buildLatestVitalField(weightPoint?.weight ?? null, weightPoint?.timestamp),
    height: buildLatestVitalField(heightPoint?.height ?? null, heightPoint?.timestamp),
    bmi: buildLatestVitalField(bmiPoint?.bmi ?? null, bmiPoint?.timestamp),
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

module.exports = {
  NOT_FOUND,
  buildPagination,
  toNumberOrNull,
  toIso,
  toDateOnlyIso,
  calculateAge,
  latestIso,
  buildLatestVitalField,
  assertDoctorScope,
  assertPatientScope,
  assertPatientResourceAccess,
  generateShareCode,
  createPoint,
  buildLatestVitals,
  buildLatestVitalsByField,
  extractNumberValues,
  aggregateStats,
};
