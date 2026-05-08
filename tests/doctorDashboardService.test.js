jest.mock('../src/repositories/dashboardRepository', () => ({
  getDoctorPatientIdentity: jest.fn(),
  getPatientIdentity: jest.fn(),
  getLatestDailyMetrics: jest.fn(),
  getLatestVitalSnapshot: jest.fn(),
}));

jest.mock('../src/services/cache/cacheService', () => ({
  getOrSetJson: jest.fn(async (_key, _ttl, loader) => loader()),
}));

const dashboardRepository = require('../src/repositories/dashboardRepository');
const {
  getDoctorDashboardPatientSummary,
  getPatientSelfDashboardSummary,
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
  });
});
