const { normalizeMetricType, metricTypeToDashboardKey } = require('../src/utils/metricTypes');

describe('metricTypes utils', () => {
  test('normalizes supported aliases to canonical metric types', () => {
    expect(normalizeMetricType('spo2')).toBe('oxygen_saturation');
    expect(normalizeMetricType('sp02')).toBe('oxygen_saturation');
    expect(normalizeMetricType('pulse')).toBe('heart_rate');
    expect(normalizeMetricType('body_weight')).toBe('weight');
  });

  test('maps canonical or alias metric types to dashboard keys', () => {
    expect(metricTypeToDashboardKey('heart_rate')).toBe('heartRate');
    expect(metricTypeToDashboardKey('spo2')).toBe('oxygenSaturation');
    expect(metricTypeToDashboardKey('systolic_pressure')).toBe('systolicBp');
    expect(metricTypeToDashboardKey('unknown_metric')).toBeNull();
  });
});
