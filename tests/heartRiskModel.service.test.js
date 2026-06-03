jest.mock('../src/repositories/patientHeartRiskRepository', () => ({
  getPatientHeartRiskSnapshot: jest.fn(),
  getLatestPatientHeartRiskAssessment: jest.fn(),
  getPatientHeartRiskAssessmentById: jest.fn(),
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
  getPatientHeartRiskAssessmentDetail,
  createDoctorDashboardPatientHeartRiskAssessment,
  updatePatientHeartRiskAssessment,
  getPatientHeartRiskPredictionHistoryDetail,
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

  test('doctor can create second-ml assessment for linked patient with audit actor', async () => {
    doctorPatientRepository.findDoctorPatientLink.mockResolvedValue({
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      isActive: true,
    });
    patientHeartRiskRepository.createPatientHeartRiskAssessment.mockResolvedValue({
      assessmentId: 'assessment-2',
      patientId: 'patient-1',
      createdByUserId: 'doctor-1',
      updatedByUserId: 'doctor-1',
      assessmentDate: '2026-06-03',
      age: 58,
    });

    const result = await createDoctorDashboardPatientHeartRiskAssessment({
      actor: { userId: 'doctor-1', role: 'doctor', accountStatus: 'active' },
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      payload: {
        assessmentDate: '2026-06-03',
        age: 58,
        sex: 0,
        chest_pain_type: 3,
        resting_bp_s: 151,
        fasting_blood_sugar: 0,
        max_heart_rate: 118,
        exercise_angina: 0,
        old_peak: 0,
        st_slope: 2,
      },
    });

    expect(patientHeartRiskRepository.createPatientHeartRiskAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-1',
        actorUserId: 'doctor-1',
      })
    );
    expect(result.createdByUserId).toBe('doctor-1');
    expect(result.updatedByUserId).toBe('doctor-1');
  });

  test('patient assessment update passes actor for audit trail', async () => {
    patientHeartRiskRepository.updatePatientHeartRiskAssessment.mockResolvedValue({
      assessmentId: 'assessment-3',
      patientId: 'user-1',
      createdByUserId: 'user-1',
      updatedByUserId: 'user-1',
      assessmentDate: '2026-06-03',
    });

    await updatePatientHeartRiskAssessment({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      assessmentId: 'assessment-3',
      payload: {
        exercise_angina: 0,
      },
    });

    expect(patientHeartRiskRepository.updatePatientHeartRiskAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'user-1',
        assessmentId: 'assessment-3',
        actorUserId: 'user-1',
      })
    );
  });

  test('patient can fetch second-ml assessment detail by assessment id', async () => {
    patientHeartRiskRepository.getPatientHeartRiskAssessmentById.mockResolvedValue({
      assessmentId: 'assessment-4',
      patientId: 'user-1',
      assessmentDate: '2026-06-03',
      age: 58,
    });

    const result = await getPatientHeartRiskAssessmentDetail({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      assessmentId: 'assessment-4',
    });

    expect(patientHeartRiskRepository.getPatientHeartRiskAssessmentById).toHaveBeenCalledWith({
      patientId: 'user-1',
      assessmentId: 'assessment-4',
    });
    expect(result.assessmentId).toBe('assessment-4');
  });

  test('history detail includes embedded assessment snapshot when assessmentId exists', async () => {
    patientMlInferenceRepository.getInferenceResultById.mockResolvedValue({
      resultId: 'result-2',
      patientId: 'user-1',
      modelKey: 'heart_disease_v1',
      inferenceType: 'prediction',
      requestContext: 'patient',
      mlVersion: 'heart-risk-v1',
      sourceSummary: {
        assessmentId: 'assessment-5',
        assessmentDate: '2026-06-03',
      },
      upstream: {
        status: 200,
        body: {
          predictedClass: 0,
          probability: 0.31,
        },
      },
    });
    patientHeartRiskRepository.getPatientHeartRiskAssessmentById.mockResolvedValue({
      assessmentId: 'assessment-5',
      patientId: 'user-1',
      assessmentDate: '2026-06-03',
      age: 58,
      sex: 0,
    });

    const result = await getPatientHeartRiskPredictionHistoryDetail({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      resultId: 'result-2',
    });

    expect(patientHeartRiskRepository.getPatientHeartRiskAssessmentById).toHaveBeenCalledWith({
      patientId: 'user-1',
      assessmentId: 'assessment-5',
    });
    expect(result.assessment).toMatchObject({
      assessmentId: 'assessment-5',
      age: 58,
      sex: 0,
    });
  });
});
