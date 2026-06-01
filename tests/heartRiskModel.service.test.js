jest.mock('../src/repositories/patientHeartRiskRepository', () => ({
  getPatientHeartRiskSnapshot: jest.fn(),
  getLatestPatientHeartRiskAssessment: jest.fn(),
  listPatientHeartRiskAssessments: jest.fn(),
  createPatientHeartRiskAssessment: jest.fn(),
  updatePatientHeartRiskAssessment: jest.fn(),
}));

jest.mock('../src/repositories/doctorPatientRepository', () => ({
  findDoctorPatientLink: jest.fn(),
}));

jest.mock('../src/repositories/patientMlInferenceRepository', () => ({
  createInferenceResult: jest.fn(),
  getLatestInferenceResult: jest.fn(),
  listInferenceResults: jest.fn(),
  getInferenceResultById: jest.fn(),
}));

jest.mock('../src/services/notification/domainNotificationService', () => ({
  sendMlResultReadyNotificationBestEffort: jest.fn(),
}));

const patientHeartRiskRepository = require('../src/repositories/patientHeartRiskRepository');
const patientMlInferenceRepository = require('../src/repositories/patientMlInferenceRepository');
const domainNotificationService = require('../src/services/notification/domainNotificationService');
const {
  getPatientHeartRiskReadiness,
  getPatientHeartRiskPredictions,
  getDoctorDashboardPatientHeartRiskReadiness,
} = require('../src/services/heartRiskModelService');
const doctorPatientRepository = require('../src/repositories/doctorPatientRepository');

describe('heartRiskModelService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('readiness derives age and vitals when latest assessment is partial', async () => {
    patientHeartRiskRepository.getPatientHeartRiskSnapshot.mockResolvedValue({
      patientProfile: {
        dateOfBirth: '2000-04-10',
        sex: 'female',
      },
      latestAssessment: {
        assessmentId: 'assessment-1',
        assessmentDate: '2026-06-01',
        chest_pain_type: 3,
        fasting_blood_sugar: 0,
        exercise_angina: 0,
        old_peak: 0,
        st_slope: 2,
      },
      latestBodyMetric: {
        systolicPressure: 151,
        heartRate: 118,
        measuredAt: '2026-06-01T07:30:00.000Z',
      },
    });

    const result = await getPatientHeartRiskReadiness({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
    });

    expect(result).toMatchObject({
      ready: true,
      modelKey: 'heart_disease_v1',
    });
    expect(result.missingFields).toEqual([]);
    expect(result.resolvedFields).toEqual(
      expect.arrayContaining(['age', 'sex', 'resting_bp_s', 'max_heart_rate'])
    );
  });

  test('prediction saves second-ml inference history with distinct model key', async () => {
    patientHeartRiskRepository.getPatientHeartRiskSnapshot.mockResolvedValue({
      patientProfile: {
        dateOfBirth: '2000-04-10',
        sex: 'female',
      },
      latestAssessment: {
        assessmentId: 'assessment-1',
        assessmentDate: '2026-06-01',
        chest_pain_type: 3,
        fasting_blood_sugar: 0,
        exercise_angina: 0,
        old_peak: 0,
        st_slope: 2,
      },
      latestBodyMetric: {
        systolicPressure: 151,
        heartRate: 118,
        measuredAt: '2026-06-01T07:30:00.000Z',
      },
    });
    patientMlInferenceRepository.createInferenceResult.mockResolvedValue({
      resultId: 'result-1',
      generatedAt: '2026-06-01T09:00:00.000Z',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(JSON.stringify({ predictedClass: 1, probability: 0.67 })),
    });

    const result = await getPatientHeartRiskPredictions({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: {},
    });

    expect(patientMlInferenceRepository.createInferenceResult).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'user-1',
        requestedByUserId: 'user-1',
        payload: expect.objectContaining({
          modelKey: 'heart_disease_v1',
          inferenceType: 'prediction',
          mlVersion: 'heart-risk-v1',
        }),
      })
    );
    expect(domainNotificationService.sendMlResultReadyNotificationBestEffort).toHaveBeenCalled();
    expect(result).toMatchObject({
      resultId: 'result-1',
      modelKey: 'heart_disease_v1',
      mlVersion: 'heart-risk-v1',
      upstream: {
        status: 200,
        body: {
          predictedClass: 1,
          probability: 0.67,
        },
      },
    });
  });

  test('doctor dashboard readiness requires active doctor-patient link', async () => {
    doctorPatientRepository.findDoctorPatientLink.mockResolvedValue({
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      isActive: true,
    });
    patientHeartRiskRepository.getPatientHeartRiskSnapshot.mockResolvedValue({
      patientProfile: {
        dateOfBirth: '2000-04-10',
        sex: 'female',
      },
      latestAssessment: null,
      latestBodyMetric: null,
    });

    const result = await getDoctorDashboardPatientHeartRiskReadiness({
      actor: { userId: 'doctor-1', role: 'doctor', accountStatus: 'active' },
      doctorId: 'doctor-1',
      patientId: 'patient-1',
    });

    expect(result.ready).toBe(false);
    expect(doctorPatientRepository.findDoctorPatientLink).toHaveBeenCalledWith({
      doctorId: 'doctor-1',
      patientId: 'patient-1',
    });
  });
});
