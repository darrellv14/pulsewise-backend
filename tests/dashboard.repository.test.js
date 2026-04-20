jest.mock('../src/config/prisma', () => ({
  $queryRaw: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const dashboardRepository = require('../src/repositories/dashboardRepository');

describe('dashboardRepository raw query parameter types', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('casts doctor and patient ids to uuid in raw dashboard queries', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await dashboardRepository.listDoctorDashboardPatients({
      doctorId: 'ba209fa8-42eb-42cc-9ece-36ef47993b40',
      q: '',
      limit: 5,
      offset: 0,
    });
    await dashboardRepository.getDoctorPatientIdentity({
      doctorId: 'ba209fa8-42eb-42cc-9ece-36ef47993b40',
      patientId: '50da9e06-6ca7-4582-a37c-34912a01bed5',
    });
    await dashboardRepository.getLatestDailyMetrics('50da9e06-6ca7-4582-a37c-34912a01bed5');
    await dashboardRepository.listDailyMetricsSeries({
      patientId: '50da9e06-6ca7-4582-a37c-34912a01bed5',
      startAt: '2026-04-01T00:00:00.000Z',
      endAt: '2026-04-20T23:59:59.999Z',
    });
    await dashboardRepository.listVitalReadingSeries({
      patientId: '50da9e06-6ca7-4582-a37c-34912a01bed5',
      startAt: '2026-04-01T00:00:00.000Z',
      endAt: '2026-04-20T23:59:59.999Z',
    });
    await dashboardRepository.getLatestVitalSnapshot('50da9e06-6ca7-4582-a37c-34912a01bed5');

    const renderedSql = prisma.$queryRaw.mock.calls.map(([strings]) => strings.join(''));

    expect(renderedSql.some((sql) => sql.includes('dp.doctor_id = ') && sql.includes('::uuid'))).toBe(
      true
    );
    expect(renderedSql.some((sql) => sql.includes('dp.patient_id = ') && sql.includes('::uuid'))).toBe(
      true
    );
    expect(renderedSql.some((sql) => sql.includes('hd.user_id = ') && sql.includes('::uuid'))).toBe(
      true
    );
    expect(renderedSql.some((sql) => sql.includes('WHERE user_id = ') && sql.includes('::uuid'))).toBe(
      true
    );
  });
});
