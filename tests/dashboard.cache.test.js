jest.mock('../src/repositories/dashboardRepository', () => ({
  getDoctorPatientIdentity: jest.fn(),
  listDailyMetricsSeries: jest.fn(),
  listVitalReadingSeries: jest.fn(),
}));

const dashboardRepository = require('../src/repositories/dashboardRepository');
const doctorDashboardService = require('../src/services/care/doctorDashboardService');
const { __resetMemoryStoreForTests } = require('../src/services/cache/cacheService');
const { invalidateDashboardPatientCaches } = require('../src/services/cache/invalidation');

describe('Dashboard cache behavior', () => {
  const actor = { userId: '8aca6089-3899-4b85-a715-0a63113e846a', role: 'doctor' };
  const doctorId = actor.userId;
  const patientId = '229f4f2c-a907-4c51-877a-c3f867453744';

  beforeEach(() => {
    __resetMemoryStoreForTests();
    jest.clearAllMocks();

    dashboardRepository.getDoctorPatientIdentity.mockResolvedValue({
      patient_id: patientId,
      first_name: 'Nadia',
      last_name: 'Saraswati',
      email: 'seed.patient2@pulsewise.local',
      tel_no: '081200000102',
      date_of_birth: '1994-09-03',
      sex: 'female',
    });
    dashboardRepository.listDailyMetricsSeries.mockResolvedValue([
      {
        measured_at: '2026-04-10T07:30:00.000Z',
        systolic_bp: 122,
        diastolic_bp: 78,
        weight: 68.2,
        height: 172.5,
        bmi: 22.9,
      },
    ]);
    dashboardRepository.listVitalReadingSeries.mockResolvedValue([
      {
        metric_type: 'heart_rate',
        value_numeric: 81,
        measured_at: '2026-04-10T07:30:00.000Z',
      },
      {
        metric_type: 'oxygen_saturation',
        value_numeric: 98,
        measured_at: '2026-04-10T07:30:00.000Z',
      },
    ]);
  });

  test('dashboard vitals uses cache hit after first miss', async () => {
    const query = { timePeriod: 'last_30_days' };

    const first = await doctorDashboardService.getDoctorDashboardPatientVitals({
      actor,
      doctorId,
      patientId,
      query,
    });
    const second = await doctorDashboardService.getDoctorDashboardPatientVitals({
      actor,
      doctorId,
      patientId,
      query,
    });

    expect(first).toEqual(second);
    expect(dashboardRepository.getDoctorPatientIdentity).toHaveBeenCalledTimes(1);
    expect(dashboardRepository.listDailyMetricsSeries).toHaveBeenCalledTimes(1);
    expect(dashboardRepository.listVitalReadingSeries).toHaveBeenCalledTimes(1);
  });

  test('dashboard abnormal report uses cache hit after first miss', async () => {
    const query = { timePeriod: 'last_30_days' };

    await doctorDashboardService.getDoctorDashboardAbnormalReport({
      actor,
      doctorId,
      patientId,
      query,
    });
    await doctorDashboardService.getDoctorDashboardAbnormalReport({
      actor,
      doctorId,
      patientId,
      query,
    });

    expect(dashboardRepository.getDoctorPatientIdentity).toHaveBeenCalledTimes(1);
    expect(dashboardRepository.listDailyMetricsSeries).toHaveBeenCalledTimes(1);
    expect(dashboardRepository.listVitalReadingSeries).toHaveBeenCalledTimes(1);
  });

  test('dashboard patient invalidation clears cached summary, vitals, and abnormal report', async () => {
    const query = { timePeriod: 'last_30_days' };

    await doctorDashboardService.getDoctorDashboardPatientVitals({
      actor,
      doctorId,
      patientId,
      query,
    });
    await doctorDashboardService.getDoctorDashboardAbnormalReport({
      actor,
      doctorId,
      patientId,
      query,
    });

    expect(dashboardRepository.getDoctorPatientIdentity).toHaveBeenCalledTimes(2);
    expect(dashboardRepository.listDailyMetricsSeries).toHaveBeenCalledTimes(2);
    expect(dashboardRepository.listVitalReadingSeries).toHaveBeenCalledTimes(2);

    await invalidateDashboardPatientCaches(patientId);

    await doctorDashboardService.getDoctorDashboardPatientVitals({
      actor,
      doctorId,
      patientId,
      query,
    });
    await doctorDashboardService.getDoctorDashboardAbnormalReport({
      actor,
      doctorId,
      patientId,
      query,
    });

    expect(dashboardRepository.getDoctorPatientIdentity).toHaveBeenCalledTimes(4);
    expect(dashboardRepository.listDailyMetricsSeries).toHaveBeenCalledTimes(4);
    expect(dashboardRepository.listVitalReadingSeries).toHaveBeenCalledTimes(4);
  });
});
