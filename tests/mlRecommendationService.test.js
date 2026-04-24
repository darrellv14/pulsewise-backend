jest.mock('../src/repositories/doctorPatientRepository', () => ({
  findDoctorPatientLink: jest.fn(),
}));

jest.mock('../src/repositories/mlRecommendationRepository', () => ({
  getPatientMlSnapshot: jest.fn(),
}));

const doctorPatientRepository = require('../src/repositories/doctorPatientRepository');
const mlRecommendationRepository = require('../src/repositories/mlRecommendationRepository');
const {
  requestMlEndpoint,
  getPatientMlPayload,
  getDoctorDashboardPatientMlReadiness,
} = require('../src/services/mlRecommendationService');

describe('mlRecommendationService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('requestMlEndpoint returns parsed response body when upstream ML request succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(JSON.stringify({ status: 200, result: {} })),
    });

    const result = await requestMlEndpoint(
      {
        endpointPath: '/recommendations/',
        payload: { Demog1_RIDAGEYR: 24 },
      },
      {
        baseUrl: 'http://localhost:8080',
        version: 3,
        timeoutMs: 2000,
      }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/v3/recommendations/',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(result.body.status).toBe(200);
  });

  test('requestMlEndpoint wraps network failures as service unavailable errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8080'));

    await expect(
      requestMlEndpoint(
        {
          endpointPath: '/recommendations/',
          payload: { Demog1_RIDAGEYR: 24 },
        },
        {
          baseUrl: 'http://localhost:8080',
          version: 3,
          timeoutMs: 2000,
        }
      )
    ).rejects.toMatchObject({
      statusCode: 503,
      message: 'Microservice ML tidak tersedia atau gagal dihubungi',
    });
  });

  test('getPatientMlPayload rejects when the patient is not ML-ready', async () => {
    mlRecommendationRepository.getPatientMlSnapshot.mockResolvedValue({
      patientProfile: {
        dateOfBirth: '2000-04-10',
      },
      diaries: [],
      vitalSignReadings: [],
      window: {
        startDate: '2026-04-18',
        endDate: '2026-04-24',
      },
    });

    await expect(
      getPatientMlPayload({
        actor: { userId: 'user-1', role: 'patient' },
        userId: 'user-1',
        query: {},
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      details: expect.objectContaining({
        code: 'ML_NOT_READY',
      }),
    });
  });

  test('doctor dashboard readiness requires an active doctor-patient link', async () => {
    doctorPatientRepository.findDoctorPatientLink.mockResolvedValue({
      doctor_id: 'doctor-1',
      patient_id: 'patient-1',
    });
    mlRecommendationRepository.getPatientMlSnapshot.mockResolvedValue({
      patientProfile: {
        dateOfBirth: '2000-04-10',
      },
      diaries: [],
      vitalSignReadings: [],
      window: {
        startDate: '2026-04-18',
        endDate: '2026-04-24',
      },
    });

    const result = await getDoctorDashboardPatientMlReadiness({
      actor: { userId: 'doctor-1', role: 'doctor' },
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      query: {},
    });

    expect(result.ready).toBe(false);
    expect(doctorPatientRepository.findDoctorPatientLink).toHaveBeenCalledWith({
      doctorId: 'doctor-1',
      patientId: 'patient-1',
    });
  });
});
