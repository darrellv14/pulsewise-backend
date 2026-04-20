jest.mock('../src/repositories/biometricRepository', () => ({
  listReadings: jest.fn(),
  countReadings: jest.fn(),
}));

jest.mock('../src/repositories/doctorPatientRepository', () => ({
  findDoctorPatientLink: jest.fn(),
}));

jest.mock('../src/repositories/profileRepository', () => ({
  getPatientProfileById: jest.fn(),
}));

const biometricRepository = require('../src/repositories/biometricRepository');
const profileRepository = require('../src/repositories/profileRepository');
const biometricService = require('../src/services/biometricService');

describe('biometricService pagination normalization', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('listBiometrics coerces page and limit to integers before repository query', async () => {
    profileRepository.getPatientProfileById.mockResolvedValue({
      patient_id: '50da9e06-6ca7-4582-a37c-34912a01bed5',
    });
    biometricRepository.listReadings.mockResolvedValue([]);
    biometricRepository.countReadings.mockResolvedValue(0);

    await biometricService.listBiometrics({
      actor: {
        userId: '50da9e06-6ca7-4582-a37c-34912a01bed5',
        role: 'patient',
      },
      query: {
        page: '2',
        limit: '5',
      },
    });

    expect(biometricRepository.listReadings).toHaveBeenCalledWith({
      userId: '50da9e06-6ca7-4582-a37c-34912a01bed5',
      source: null,
      metricType: null,
      startAt: null,
      endAt: null,
      limit: 5,
      offset: 5,
    });
  });
});
