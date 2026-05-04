const METRIC_REGISTRY = Object.freeze({
  heart_rate: {
    canonical: 'heart_rate',
    dashboardKey: 'heartRate',
    aliases: ['heart_rate', 'heartrate', 'hr', 'pulse'],
  },
  oxygen_saturation: {
    canonical: 'oxygen_saturation',
    dashboardKey: 'oxygenSaturation',
    aliases: ['oxygen_saturation', 'oxygen', 'spo2', 'sp02'],
  },
  systolic_bp: {
    canonical: 'systolic_bp',
    dashboardKey: 'systolicBp',
    aliases: ['systolic_bp', 'systolic_pressure', 'systolic'],
  },
  diastolic_bp: {
    canonical: 'diastolic_bp',
    dashboardKey: 'diastolicBp',
    aliases: ['diastolic_bp', 'diastolic_pressure', 'diastolic'],
  },
  weight: {
    canonical: 'weight',
    dashboardKey: 'weight',
    aliases: ['weight', 'body_weight'],
  },
  height: {
    canonical: 'height',
    dashboardKey: 'height',
    aliases: ['height', 'body_height'],
  },
  bmi: {
    canonical: 'bmi',
    dashboardKey: 'bmi',
    aliases: ['bmi'],
  },
  total_cholesterol: {
    canonical: 'total_cholesterol',
    dashboardKey: null,
    aliases: ['total_cholesterol'],
  },
  urine_flow_rate: {
    canonical: 'urine_flow_rate',
    dashboardKey: null,
    aliases: ['urine_flow_rate'],
  },
  urination_time: {
    canonical: 'urination_time',
    dashboardKey: null,
    aliases: ['urination_time'],
  },
  urine_volume: {
    canonical: 'urine_volume',
    dashboardKey: null,
    aliases: ['urine_volume'],
  },
  pulse_regularity_code: {
    canonical: 'pulse_regularity_code',
    dashboardKey: null,
    aliases: ['pulse_regularity_code'],
  },
});

const aliasToCanonical = new Map();
const canonicalToDashboardKey = new Map();

for (const entry of Object.values(METRIC_REGISTRY)) {
  canonicalToDashboardKey.set(entry.canonical, entry.dashboardKey || null);

  for (const alias of entry.aliases) {
    aliasToCanonical.set(alias, entry.canonical);
  }
}

function normalizeMetricType(metricType) {
  const normalized = String(metricType || '')
    .trim()
    .toLowerCase();

  return aliasToCanonical.get(normalized) || null;
}

function metricTypeToDashboardKey(metricType) {
  const canonical = normalizeMetricType(metricType);
  if (!canonical) {
    return null;
  }

  return canonicalToDashboardKey.get(canonical) || null;
}

module.exports = {
  METRIC_REGISTRY,
  normalizeMetricType,
  metricTypeToDashboardKey,
};
