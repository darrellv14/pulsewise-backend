jest.mock('../src/repositories/doctorPatientRepository', () => ({
  findDoctorPatientLink: jest.fn(),
}));

jest.mock('../src/repositories/mlRecommendationRepository', () => ({
  getPatientMlSnapshot: jest.fn(),
}));

jest.mock('../src/repositories/patientMlInferenceRepository', () => ({
  createInferenceResult: jest.fn(),
  getLatestInferenceResult: jest.fn(),
  listInferenceResults: jest.fn(),
}));

jest.mock('../src/services/notification/domainNotificationService', () => ({
  sendMlResultReadyNotificationBestEffort: jest.fn(),
}));

jest.mock('../src/utils/mlPayloadMapper', () => {
  const actual = jest.requireActual('../src/utils/mlPayloadMapper');
  return {
    ...actual,
    buildMlV3Payload: jest.fn(actual.buildMlV3Payload),
  };
});

const doctorPatientRepository = require('../src/repositories/doctorPatientRepository');
const mlRecommendationRepository = require('../src/repositories/mlRecommendationRepository');
const patientMlInferenceRepository = require('../src/repositories/patientMlInferenceRepository');
const domainNotificationService = require('../src/services/notification/domainNotificationService');
const { buildMlV3Payload } = require('../src/utils/mlPayloadMapper');
const {
  requestMlEndpoint,
  getPatientMlPayload,
  getPatientMlPredictions,
  getDoctorDashboardPatientMlReadiness,
  getPatientLatestMlPrediction,
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

  test('getPatientMlPayload still returns payload and readiness details when the patient is not ML-ready', async () => {
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

    const result = await getPatientMlPayload({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: {},
    });

    expect(result).toMatchObject({
      ready: false,
      missingFields: expect.any(Array),
      resolvedFields: expect.any(Array),
      mlVersion: 'hfms-v3',
      payload: expect.any(Object),
      sourceSummary: expect.any(Object),
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

  test('getPatientMlPredictions saves inference result snapshot', async () => {
    mlRecommendationRepository.getPatientMlSnapshot.mockResolvedValue({
      window: {
        startDate: '2026-04-18',
        endDate: '2026-04-24',
      },
    });
    buildMlV3Payload.mockReturnValueOnce({
      payload: { Demog1_RIDAGEYR: 24 },
      missingFields: [],
      resolvedFields: ['Demog1_RIDAGEYR'],
      sourceSummary: { diaries: 7 },
    });
    patientMlInferenceRepository.createInferenceResult.mockResolvedValue({
      resultId: 'latest-result-id',
      generatedAt: '2026-05-05T12:45:00.000Z',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(JSON.stringify({ risk: 0.42 })),
    });

    const result = await getPatientMlPredictions({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: {},
    });

    expect(patientMlInferenceRepository.createInferenceResult).toHaveBeenCalled();
    expect(domainNotificationService.sendMlResultReadyNotificationBestEffort).toHaveBeenCalledWith({
      patientId: 'user-1',
      requestedByUserId: 'user-1',
      result: {
        resultId: 'latest-result-id',
        generatedAt: '2026-05-05T12:45:00.000Z',
      },
      inferenceType: 'prediction',
    });
    expect(result).toMatchObject({
      resultId: 'latest-result-id',
      generatedAt: '2026-05-05T12:45:00.000Z',
      upstream: {
        status: 200,
        body: { risk: 0.42 },
      },
    });
  });

  test('getPatientLatestMlPrediction returns persisted latest snapshot', async () => {
    patientMlInferenceRepository.getLatestInferenceResult.mockResolvedValue({
      resultId: 'latest-result-id',
      inferenceType: 'prediction',
    });

    const result = await getPatientLatestMlPrediction({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
    });

    expect(patientMlInferenceRepository.getLatestInferenceResult).toHaveBeenCalledWith({
      patientId: 'user-1',
      inferenceType: 'prediction',
    });
    expect(result).toEqual({
      resultId: 'latest-result-id',
      inferenceType: 'prediction',
    });
  });
});
