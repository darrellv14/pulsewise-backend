const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const {
  expectObjectKeys,
  expectSuccessEnvelope,
} = require('./helpers/contractAssertions');

jest.mock('../src/services/mlRecommendationService', () => ({
  getPatientMlReadiness: jest.fn(),
  getPatientMlPayload: jest.fn(),
  getPatientMlPredictions: jest.fn(),
  getPatientMlRecommendations: jest.fn(),
  getPatientLatestMlPrediction: jest.fn(),
  getPatientLatestMlRecommendation: jest.fn(),
  listPatientMlPredictionHistory: jest.fn(),
  listPatientMlRecommendationHistory: jest.fn(),
  getDoctorDashboardPatientMlReadiness: jest.fn(),
  getDoctorDashboardPatientMlPayload: jest.fn(),
  getDoctorDashboardPatientMlPredictions: jest.fn(),
  getDoctorDashboardPatientMlRecommendations: jest.fn(),
  getDoctorDashboardPatientLatestMlPrediction: jest.fn(),
  getDoctorDashboardPatientLatestMlRecommendation: jest.fn(),
  listDoctorDashboardPatientMlPredictionHistory: jest.fn(),
  listDoctorDashboardPatientMlRecommendationHistory: jest.fn(),
}));

const mlRecommendationService = require('../src/services/mlRecommendationService');
const app = require('../src/app');

function issuePatientToken(userId) {
  return jwt.sign(
    {
      userId,
      email: 'patient@pulsewise.local',
      role: 'patient',
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
}

function issueDoctorToken(userId) {
  return jwt.sign(
    {
      userId,
      email: 'doctor@pulsewise.local',
      role: 'doctor',
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
}

describe('ML recommendation API contract', () => {
  const patientId = '229f4f2c-a907-4c51-877a-c3f867453744';
  const doctorId = '8aca6089-3899-4b85-a715-0a63113e846a';
  const patientToken = issuePatientToken(patientId);
  const doctorToken = issueDoctorToken(doctorId);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST patient ml-predictions keeps stable envelope and adds resultId/generatedAt', async () => {
    mlRecommendationService.getPatientMlPredictions.mockResolvedValue({
      resultId: 'c7aafc39-0692-4c1f-b991-5881ac7f6c31',
      generatedAt: '2026-05-05T12:30:00.000Z',
      mlVersion: 'hfms-v3',
      window: {
        startDate: '2026-04-29',
        endDate: '2026-05-05',
      },
      payloadHash: 'sha256:abc',
      sourceSummary: {
        diaries: 7,
      },
      upstream: {
        endpoint: 'http://ml/v3/predictions/',
        status: 200,
        body: { risk: 0.72 },
      },
    });

    const response = await request(app)
      .post(`/users/${patientId}/ml-predictions`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({});

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Prediksi dari microservice ML berhasil diambil');
    expectObjectKeys(response.body.data, [
      'resultId',
      'generatedAt',
      'mlVersion',
      'window',
      'payloadHash',
      'sourceSummary',
      'upstream',
    ]);
  });

  test('GET patient latest ml-prediction returns stable shape', async () => {
    mlRecommendationService.getPatientLatestMlPrediction.mockResolvedValue({
      resultId: 'c7aafc39-0692-4c1f-b991-5881ac7f6c31',
      patientId,
      requestedByUserId: patientId,
      inferenceType: 'prediction',
      requestContext: 'patient',
      mlVersion: 'hfms-v3',
      payloadHash: 'sha256:abc',
      payload: null,
      sourceSummary: { diaries: 7 },
      window: { startDate: '2026-04-29', endDate: '2026-05-05' },
      upstream: {
        endpoint: 'http://ml/v3/predictions/',
        status: 200,
        body: { risk: 0.72 },
      },
      generatedAt: '2026-05-05T12:30:00.000Z',
      createdAt: '2026-05-05T12:30:00.000Z',
    });

    const response = await request(app)
      .get(`/users/${patientId}/ml-predictions/latest`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Prediksi ML terbaru pasien berhasil diambil');
    expectObjectKeys(response.body.data, [
      'resultId',
      'patientId',
      'requestedByUserId',
      'inferenceType',
      'requestContext',
      'mlVersion',
      'payloadHash',
      'payload',
      'sourceSummary',
      'window',
      'upstream',
      'generatedAt',
      'createdAt',
    ]);
  });

  test('GET patient ml-prediction history returns list envelope', async () => {
    mlRecommendationService.listPatientMlPredictionHistory.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
      },
    });

    const response = await request(app)
      .get(`/users/${patientId}/ml-predictions/history?page=1&limit=10`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Riwayat prediksi ML pasien berhasil diambil');
    expectObjectKeys(response.body.data, ['items', 'pagination']);
  });

  test('GET doctor dashboard latest recommendation route is registered', async () => {
    mlRecommendationService.getDoctorDashboardPatientLatestMlRecommendation.mockResolvedValue({
      resultId: 'c7aafc39-0692-4c1f-b991-5881ac7f6c31',
      patientId,
      requestedByUserId: doctorId,
      inferenceType: 'recommendation',
      requestContext: 'doctor_dashboard',
      mlVersion: 'hfms-v3',
      payloadHash: 'sha256:def',
      payload: null,
      sourceSummary: { diaries: 7 },
      window: { startDate: '2026-04-29', endDate: '2026-05-05' },
      upstream: {
        endpoint: 'http://ml/v3/recommendations/',
        status: 200,
        body: { recommendations: [] },
      },
      generatedAt: '2026-05-05T12:30:00.000Z',
      createdAt: '2026-05-05T12:30:00.000Z',
    });

    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/patients/${patientId}/ml-recommendations/latest`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Rekomendasi ML terbaru pasien dashboard berhasil diambil');
  });
});
