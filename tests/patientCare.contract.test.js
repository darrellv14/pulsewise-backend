const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const {
  expectObjectKeys,
  expectSuccessEnvelope,
} = require('./helpers/contractAssertions');

jest.mock('../src/services/patientCareService', () => ({
  createDailyBodyMetric: jest.fn(),
  createDailyBodyMetricByDate: jest.fn(),
  getHeartDiaryByDate: jest.fn(),
  getHeartDiaryDetail: jest.fn(),
}));

const patientCareService = require('../src/services/patientCareService');
const app = require('../src/app');

function issuePatientToken(patientId) {
  return jwt.sign(
    {
      userId: patientId,
      email: 'patient@pulsewise.local',
      role: 'patient',
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
}

describe('Patient care API contract', () => {
  const userId = '229f4f2c-a907-4c51-877a-c3f867453744';
  const diaryId = '5e5f09ab-5543-435d-b0fb-9a8ef041d8b0';
  const token = issuePatientToken(userId);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /users/:userId/diaries/:diaryId/body-metrics returns enriched body metric contract', async () => {
    patientCareService.createDailyBodyMetric.mockResolvedValue({
      metricId: '7b5d8f10-1111-4222-8333-1234567890ab',
      diaryId,
      conditionTag: 'after_breakfast',
      bodyHeight: 172.5,
      bodyWeight: 68.2,
      bmi: 22.9,
      systolicPressure: 122,
      diastolicPressure: 78,
      heartRate: 74,
      latestHeartRate: 81,
      latestHeartRateMeasuredAt: '2026-05-04T08:30:00.000Z',
      latestOxygenSaturation: 98,
      latestOxygenSaturationMeasuredAt: '2026-05-04T08:31:00.000Z',
      timeStamp: '2026-04-10T07:30:00.000Z',
    });

    const response = await request(app)
      .post(`/users/${userId}/diaries/${diaryId}/body-metrics`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        conditionTag: 'after_breakfast',
        bodyHeight: 172.5,
        bodyWeight: 68.2,
        bmi: 22.9,
        systolicPressure: 122,
        diastolicPressure: 78,
        heartRate: 74,
        timeStamp: '2026-04-10T07:30:00.000Z',
      });

    expect(response.status).toBe(201);
    expectSuccessEnvelope(response, 'Body metric diary berhasil ditambahkan');
    expectObjectKeys(response.body.data, [
      'metricId',
      'diaryId',
      'conditionTag',
      'bodyHeight',
      'bodyWeight',
      'bmi',
      'systolicPressure',
      'diastolicPressure',
      'heartRate',
      'latestHeartRate',
      'latestHeartRateMeasuredAt',
      'latestOxygenSaturation',
      'latestOxygenSaturationMeasuredAt',
      'timeStamp',
    ]);
  });

  test('PUT /users/:userId/diaries/by-date/body-metrics returns enriched body metric contract', async () => {
    patientCareService.createDailyBodyMetricByDate.mockResolvedValue({
      metricId: '7b5d8f10-1111-4222-8333-1234567890ab',
      diaryId,
      conditionTag: 'after_breakfast',
      bodyHeight: 172.5,
      bodyWeight: 68.2,
      bmi: 22.9,
      systolicPressure: 122,
      diastolicPressure: 78,
      heartRate: 74,
      latestHeartRate: 81,
      latestHeartRateMeasuredAt: '2026-05-04T08:30:00.000Z',
      latestOxygenSaturation: 98,
      latestOxygenSaturationMeasuredAt: '2026-05-04T08:31:00.000Z',
      timeStamp: '2026-04-10T07:30:00.000Z',
    });

    const response = await request(app)
      .put(`/users/${userId}/diaries/by-date/body-metrics`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        diaryDate: '2026-04-10',
        bodyHeight: 172.5,
        bodyWeight: 68.2,
        bmi: 22.9,
        systolicPressure: 122,
        diastolicPressure: 78,
        heartRate: 74,
        timeStamp: '2026-04-10T07:30:00.000Z',
      });

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Body metric diary berdasarkan tanggal berhasil disimpan');
    expectObjectKeys(response.body.data, [
      'metricId',
      'diaryId',
      'conditionTag',
      'bodyHeight',
      'bodyWeight',
      'bmi',
      'systolicPressure',
      'diastolicPressure',
      'heartRate',
      'latestHeartRate',
      'latestHeartRateMeasuredAt',
      'latestOxygenSaturation',
      'latestOxygenSaturationMeasuredAt',
      'timeStamp',
    ]);
  });

  test('GET /users/:userId/diaries/by-date returns enriched diary detail contract', async () => {
    patientCareService.getHeartDiaryByDate.mockResolvedValue({
      diaryId,
      userId,
      diaryDate: '2026-04-10',
      createdAt: '2026-04-10T08:15:00.000Z',
      bodyMetrics: [
        {
          metricId: '7b5d8f10-1111-4222-8333-1234567890ab',
          diaryId,
          conditionTag: 'after_breakfast',
          bodyHeight: 172.5,
          bodyWeight: 68.2,
          bmi: 22.9,
          systolicPressure: 122,
          diastolicPressure: 78,
          heartRate: 74,
          latestHeartRate: 81,
          latestHeartRateMeasuredAt: '2026-05-04T08:30:00.000Z',
          latestOxygenSaturation: 98,
          latestOxygenSaturationMeasuredAt: '2026-05-04T08:31:00.000Z',
          timeStamp: '2026-04-10T07:30:00.000Z',
        },
      ],
      symptoms: [],
      activities: [],
      consumptions: [],
      sleepRecord: null,
    });

    const response = await request(app)
      .get(`/users/${userId}/diaries/by-date?date=2026-04-10`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Detail heart diary berdasarkan tanggal berhasil diambil');
    expectObjectKeys(response.body.data, [
      'diaryId',
      'userId',
      'diaryDate',
      'createdAt',
      'bodyMetrics',
      'symptoms',
      'activities',
      'consumptions',
      'sleepRecord',
    ]);
    expectObjectKeys(response.body.data.bodyMetrics[0], [
      'metricId',
      'diaryId',
      'conditionTag',
      'bodyHeight',
      'bodyWeight',
      'bmi',
      'systolicPressure',
      'diastolicPressure',
      'heartRate',
      'latestHeartRate',
      'latestHeartRateMeasuredAt',
      'latestOxygenSaturation',
      'latestOxygenSaturationMeasuredAt',
      'timeStamp',
    ]);
  });

  test('GET /users/:userId/diaries/:diaryId returns enriched diary detail contract', async () => {
    patientCareService.getHeartDiaryDetail.mockResolvedValue({
      diaryId,
      userId,
      diaryDate: '2026-04-10',
      createdAt: '2026-04-10T08:15:00.000Z',
      bodyMetrics: [
        {
          metricId: '7b5d8f10-1111-4222-8333-1234567890ab',
          diaryId,
          conditionTag: 'after_breakfast',
          bodyHeight: 172.5,
          bodyWeight: 68.2,
          bmi: 22.9,
          systolicPressure: 122,
          diastolicPressure: 78,
          heartRate: 74,
          latestHeartRate: 81,
          latestHeartRateMeasuredAt: '2026-05-04T08:30:00.000Z',
          latestOxygenSaturation: 98,
          latestOxygenSaturationMeasuredAt: '2026-05-04T08:31:00.000Z',
          timeStamp: '2026-04-10T07:30:00.000Z',
        },
      ],
      symptoms: [],
      activities: [],
      consumptions: [],
      sleepRecord: null,
    });

    const response = await request(app)
      .get(`/users/${userId}/diaries/${diaryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Detail heart diary berhasil diambil');
    expectObjectKeys(response.body.data, [
      'diaryId',
      'userId',
      'diaryDate',
      'createdAt',
      'bodyMetrics',
      'symptoms',
      'activities',
      'consumptions',
      'sleepRecord',
    ]);
  });

  test('GET /users/:userId/diaries/:diaryId returns 404 when diary is missing', async () => {
    patientCareService.getHeartDiaryDetail.mockRejectedValue(
      Object.assign(new Error('Heart diary tidak ditemukan'), { statusCode: 404 })
    );

    const response = await request(app)
      .get(`/users/${userId}/diaries/${diaryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
