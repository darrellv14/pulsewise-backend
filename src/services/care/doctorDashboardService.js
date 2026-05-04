const env = require('../../config/env');
const dashboardRepository = require('../../repositories/dashboardRepository');
const thresholds = require('../../constants/dashboardThresholds');
const { normalizePaginationInput } = require('../../utils/pagination');
const { metricTypeToDashboardKey } = require('../../utils/metricTypes');
const { getOrSetJson } = require('../cache/cacheService');
const {
  dashboardPatientsListKey,
  dashboardPatientSummaryKey,
} = require('../cache/cacheKeys');
const {
  NOT_FOUND,
  buildPagination,
  toNumberOrNull,
  toIso,
  toDateOnlyIso,
  calculateAge,
  latestIso,
  assertDoctorScope,
  formatPatientIdentity,
  createPoint,
  buildLatestVitals,
  extractNumberValues,
  aggregateStats,
} = require('./shared');
const { createHttpError } = require('../../utils/httpError');

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
    const metric = metricTypeToDashboardKey(reading.metric_type);

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

async function listDoctorDashboardPatients({ actor, doctorId, query }) {
  assertDoctorScope({ actor, doctorId });

  return getOrSetJson(
    dashboardPatientsListKey({ doctorId, query: query || {} }),
    env.cache.dashboardListTtlSeconds,
    async () => {
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
  );
}

async function getDoctorDashboardPatientSummary({ actor, doctorId, patientId }) {
  assertDoctorScope({ actor, doctorId });

  return getOrSetJson(
    dashboardPatientSummaryKey({ doctorId, patientId }),
    env.cache.dashboardSummaryTtlSeconds,
    async () => {
      const identity = await dashboardRepository.getDoctorPatientIdentity({ doctorId, patientId });
      if (!identity) {
        throw createHttpError('Data pasien dokter tidak ditemukan', NOT_FOUND);
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
        const key = metricTypeToDashboardKey(reading.metric_type);
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
  );
}

async function getDoctorDashboardPatientVitals({ actor, doctorId, patientId, query }) {
  assertDoctorScope({ actor, doctorId });

  const identity = await dashboardRepository.getDoctorPatientIdentity({ doctorId, patientId });
  if (!identity) {
    throw createHttpError('Data pasien dokter tidak ditemukan', NOT_FOUND);
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
    throw createHttpError('Data pasien dokter tidak ditemukan', NOT_FOUND);
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
  listDoctorDashboardPatients,
  getDoctorDashboardPatientSummary,
  getDoctorDashboardPatientVitals,
  getDoctorDashboardAbnormalReport,
};
