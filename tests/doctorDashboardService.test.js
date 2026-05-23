jest.mock('../src/repositories/dashboardRepository', () => ({
  getDoctorPatientIdentity: jest.fn(),
  getPatientIdentity: jest.fn(),
  getLatestDailyMetrics: jest.fn(),
  getLatestVitalSnapshot: jest.fn(),
  listDailyMetricsSeries: jest.fn(),
  listVitalReadingSeries: jest.fn(),
}));

jest.mock('../src/services/cache/cacheService', () => ({
  getOrSetJson: jest.fn(async (_key, _ttl, loader) => loader()),
}));

const dashboardRepository = require('../src/repositories/dashboardRepository');
const {
  getDoctorDashboardPatientSummary,
  getPatientSelfDashboardSummary,
  getDoctorDashboardPatientVitals,
} = require('../src/services/care/doctorDashboardService');

describe('doctorDashboardService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('summary service merges daily metrics and biometrics without helper import errors', async () => {
    dashboardRepository.getDoctorPatientIdentity.mockResolvedValue({
      patient_id: 'patient-1',
      first_name: 'Nadia',
      last_name: 'Saraswati',
      email: 'seed.patient2@pulsewise.local',
      tel_no: '0812',
      date_of_birth: '1994-09-03',
      sex: 'female',
    });
    dashboardRepository.getLatestDailyMetrics.mockResolvedValue({
      measured_at: '2026-04-10T07:30:00.000Z',
      systolic_bp: 122,
      diastolic_bp: 78,
      weight: 68.2,
      height: 172.5,
      bmi: 22.9,
    });
    dashboardRepository.getLatestVitalSnapshot.mockResolvedValue([
      {
        metric_type: 'heart_rate',
        value_numeric: 81,
        measured_at: '2026-04-10T07:35:00.000Z',
      },
      {
        metric_type: 'oxygen_saturation',
        value_numeric: 98,
        measured_at: '2026-04-10T07:36:00.000Z',
      },
    ]);

    const result = await getDoctorDashboardPatientSummary({
      actor: { userId: 'doctor-1', role: 'doctor' },
      doctorId: 'doctor-1',
      patientId: 'patient-1',
    });

    expect(result.latestVitals).toMatchObject({
      measuredAt: '2026-04-10T07:36:00.000Z',
      heartRate: 81,
      oxygenSaturation: 98,
      systolicBp: 122,
      diastolicBp: 78,
    });
    expect(result.latestVitalsByField).toMatchObject({
      systolicBp: {
        value: 122,
        measuredAt: '2026-04-10T07:30:00.000Z',
      },
      heartRate: {
        value: 81,
        measuredAt: '2026-04-10T07:35:00.000Z',
      },
      oxygenSaturation: {
        value: 98,
        measuredAt: '2026-04-10T07:36:00.000Z',
      },
    });
  });

  test('patient self summary reuses the same aggregation shape', async () => {
    dashboardRepository.getPatientIdentity.mockResolvedValue({
      patient_id: 'patient-1',
      first_name: 'Nadia',
      last_name: 'Saraswati',
      email: 'seed.patient2@pulsewise.local',
      tel_no: '0812',
      date_of_birth: '1994-09-03',
      sex: 'female',
    });
    dashboardRepository.getLatestDailyMetrics.mockResolvedValue({
      measured_at: '2026-04-10T07:30:00.000Z',
      systolic_bp: 122,
      diastolic_bp: 78,
      weight: 68.2,
      height: 172.5,
      bmi: 22.9,
    });
    dashboardRepository.getLatestVitalSnapshot.mockResolvedValue([
      {
        metric_type: 'heart_rate',
        value_numeric: 81,
        measured_at: '2026-04-10T07:35:00.000Z',
      },
      {
        metric_type: 'oxygen_saturation',
        value_numeric: 98,
        measured_at: '2026-04-10T07:36:00.000Z',
      },
    ]);

    const result = await getPatientSelfDashboardSummary({
      actor: { userId: 'patient-1', role: 'patient' },
      userId: 'patient-1',
    });

    expect(result.patient).toMatchObject({
      patientId: 'patient-1',
      firstName: 'Nadia',
    });
    expect(result.latestVitals).toMatchObject({
      measuredAt: '2026-04-10T07:36:00.000Z',
      heartRate: 81,
      oxygenSaturation: 98,
      systolicBp: 122,
      diastolicBp: 78,
    });
    expect(result.latestVitalsByField).toMatchObject({
      systolicBp: {
        value: 122,
        measuredAt: '2026-04-10T07:30:00.000Z',
      },
      heartRate: {
        value: 81,
        measuredAt: '2026-04-10T07:35:00.000Z',
      },
      oxygenSaturation: {
        value: 98,
        measuredAt: '2026-04-10T07:36:00.000Z',
      },
    });
  });

  test('summary falls back to manual diary heart rate when biometric reading is absent', async () => {
    dashboardRepository.getDoctorPatientIdentity.mockResolvedValue({
      patient_id: 'patient-1',
      first_name: 'Nadia',
      last_name: 'Saraswati',
      email: 'seed.patient2@pulsewise.local',
      tel_no: '0812',
      date_of_birth: '1994-09-03',
      sex: 'female',
    });
    dashboardRepository.getLatestDailyMetrics.mockResolvedValue({
      measured_at: '2026-04-10T08:00:00.000Z',
      systolic_bp: 118,
      diastolic_bp: 76,
      heart_rate: 77,
      oxygen_saturation: 96,
      weight: 68.2,
      height: 172.5,
      bmi: 22.9,
    });
    dashboardRepository.getLatestVitalSnapshot.mockResolvedValue([
      {
        metric_type: 'oxygen_saturation',
        value_numeric: 98,
        measured_at: '2026-04-10T07:36:00.000Z',
      },
    ]);

    const result = await getDoctorDashboardPatientSummary({
      actor: { userId: 'doctor-1', role: 'doctor' },
      doctorId: 'doctor-1',
      patientId: 'patient-1',
    });

    expect(result.latestVitals).toMatchObject({
      measuredAt: '2026-04-10T08:00:00.000Z',
      heartRate: 77,
      oxygenSaturation: 96,
    });
    expect(result.latestVitalsByField.heartRate).toEqual({
      value: 77,
      measuredAt: '2026-04-10T08:00:00.000Z',
    });
    expect(result.latestVitalsByField.oxygenSaturation).toEqual({
      value: 96,
      measuredAt: '2026-04-10T08:00:00.000Z',
    });
  });

  test('vitals series includes manual diary heart rate when no biometric heart rate exists', async () => {
    dashboardRepository.getDoctorPatientIdentity.mockResolvedValue({
      patient_id: 'patient-1',
      first_name: 'Nadia',
      last_name: 'Saraswati',
      email: 'seed.patient2@pulsewise.local',
      tel_no: '0812',
      date_of_birth: '1994-09-03',
      sex: 'female',
    });
    dashboardRepository.listDailyMetricsSeries.mockResolvedValue([
      {
        measured_at: '2026-04-10T08:00:00.000Z',
        systolic_bp: 118,
        diastolic_bp: 76,
        heart_rate: 77,
        oxygen_saturation: 96,
        weight: 68.2,
        height: 172.5,
        bmi: 22.9,
      },
    ]);
    dashboardRepository.listVitalReadingSeries.mockResolvedValue([
      {
        metric_type: 'oxygen_saturation',
        value_numeric: 98,
        measured_at: '2026-04-10T08:05:00.000Z',
      },
    ]);

    const result = await getDoctorDashboardPatientVitals({
      actor: { userId: 'doctor-1', role: 'doctor' },
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      query: { timePeriod: 'last_30_days' },
    });

    expect(result.series.heartRate).toEqual([77, null]);
    expect(result.series.oxygenSaturation).toEqual([96, 98]);
    expect(result.latestVitals).toMatchObject({
      measuredAt: '2026-04-10T08:05:00.000Z',
      heartRate: 77,
      oxygenSaturation: 98,
    });
    expect(result.latestVitalsByField.heartRate).toEqual({
      value: 77,
      measuredAt: '2026-04-10T08:00:00.000Z',
    });
    expect(result.latestVitalsByField.oxygenSaturation).toEqual({
      value: 98,
      measuredAt: '2026-04-10T08:05:00.000Z',
    });
  });
});
