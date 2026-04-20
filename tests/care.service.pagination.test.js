jest.mock('../src/repositories/profileRepository', () => ({
  listPatientProfiles: jest.fn(),
}));

jest.mock('../src/repositories/doctorPatientRepository', () => ({
  listDoctorPatients: jest.fn(),
}));

jest.mock('../src/repositories/dashboardRepository', () => ({
  listDoctorDashboardPatients: jest.fn(),
}));

jest.mock('../src/repositories/patientShareRepository', () => ({}));
jest.mock('../src/services/dashboardPairingService', () => ({}));

const profileRepository = require('../src/repositories/profileRepository');
const doctorPatientRepository = require('../src/repositories/doctorPatientRepository');
const dashboardRepository = require('../src/repositories/dashboardRepository');
const careService = require('../src/services/careService');

describe('careService pagination normalization', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('listPatients coerces page and limit to integers before reaching Prisma-backed repository', async () => {
    profileRepository.listPatientProfiles.mockResolvedValue({
      items: [],
      totalItems: 0,
    });

    await careService.listPatients({
      page: '2',
      limit: '5',
      sortBy: 'created_at',
      order: 'desc',
    });

    expect(profileRepository.listPatientProfiles).toHaveBeenCalledWith({
      limit: 5,
      offset: 5,
      sortBy: 'created_at',
      order: 'desc',
    });
  });

  test('listDoctorPatients coerces page and limit to integers before reaching Prisma-backed repository', async () => {
    doctorPatientRepository.listDoctorPatients.mockResolvedValue({
      items: [],
      totalItems: 0,
    });

    await careService.listDoctorPatients({
      doctorId: 'ba209fa8-42eb-42cc-9ece-36ef47993b40',
      page: '3',
      limit: '4',
    });

    expect(doctorPatientRepository.listDoctorPatients).toHaveBeenCalledWith({
      doctorId: 'ba209fa8-42eb-42cc-9ece-36ef47993b40',
      limit: 4,
      offset: 8,
    });
  });

  test('listDoctorDashboardPatients coerces page and limit to integers before raw dashboard query', async () => {
    dashboardRepository.listDoctorDashboardPatients.mockResolvedValue({
      items: [],
      totalItems: 0,
    });

    await careService.listDoctorDashboardPatients({
      actor: {
        userId: 'ba209fa8-42eb-42cc-9ece-36ef47993b40',
        role: 'doctor',
      },
      doctorId: 'ba209fa8-42eb-42cc-9ece-36ef47993b40',
      query: {
        page: '2',
        limit: '7',
        q: '',
      },
    });

    expect(dashboardRepository.listDoctorDashboardPatients).toHaveBeenCalledWith({
      doctorId: 'ba209fa8-42eb-42cc-9ece-36ef47993b40',
      q: '',
      limit: 7,
      offset: 7,
    });
  });
});
