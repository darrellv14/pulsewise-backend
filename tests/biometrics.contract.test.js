const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const {
  expectObjectKeys,
  expectSuccessEnvelope,
  expectFailureEnvelope,
} = require('./helpers/contractAssertions');

jest.mock('../src/services/biometricService', () => ({
  ingestBiometrics: jest.fn(),
  listBiometrics: jest.fn(),
}));

const biometricService = require('../src/services/biometricService');
const app = require('../src/app');

function issueToken({ userId, role }) {
  return jwt.sign(
    {
      userId,
      email: `${role}@pulsewise.local`,
      role,
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
}

describe('Biometrics API contract', () => {
  const patientId = '229f4f2c-a907-4c51-877a-c3f867453744';
  const token = issueToken({ userId: patientId, role: 'patient' });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/v1/biometrics returns ingest summary contract', async () => {
    biometricService.ingestBiometrics.mockResolvedValue({
      patientId,
      source: 'health_connect',
      totalReceived: 2,
      insertedCount: 1,
      duplicateCount: 1,
      items: [
        {
          readingId: 1001,
          metricType: 'systolic_bp',
          measuredAt: '2026-04-10T08:00:00.000Z',
          valueNumeric: 128,
          unit: 'mmHg',
          duplicate: false,
        },
      ],
    });

    const response = await request(app)
      .post('/api/v1/biometrics')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'health_connect',
        readings: [
          {
            metricType: 'systolic_bp',
            valueNumeric: 128,
            unit: 'mmHg',
            measuredAt: '2026-04-10T08:00:00.000Z',
          },
        ],
      });

    expect(response.status).toBe(201);
    expectSuccessEnvelope(response, 'Ingest biometrik berhasil diproses');
    expectObjectKeys(response.body.data, [
      'patientId',
      'source',
      'totalReceived',
      'insertedCount',
      'duplicateCount',
      'items',
    ]);
    expectObjectKeys(response.body.data.items[0], [
      'readingId',
      'metricType',
      'measuredAt',
      'valueNumeric',
      'unit',
      'duplicate',
    ]);
  });

  test('GET /api/v1/biometrics returns history contract', async () => {
    biometricService.listBiometrics.mockResolvedValue({
      patientId,
      filters: {
        source: 'health_connect',
        metricType: 'systolic_bp',
        startAt: null,
        endAt: null,
      },
      items: [
        {
          readingId: 1001,
          source: 'health_connect',
          metricType: 'systolic_bp',
          valueNumeric: 128,
          unit: 'mmHg',
          payload: null,
          measuredAt: '2026-04-10T08:00:00.000Z',
          receivedAt: '2026-04-10T08:00:05.000Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        totalItems: 1,
        totalPages: 1,
      },
    });

    const response = await request(app)
      .get('/api/v1/biometrics?metricType=systolic_bp&page=1&limit=50')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Histori biometrik berhasil diambil');
    expectObjectKeys(response.body.data, ['patientId', 'filters', 'items', 'pagination']);
    expectObjectKeys(response.body.data.items[0], [
      'readingId',
      'source',
      'metricType',
      'valueNumeric',
      'unit',
      'payload',
      'measuredAt',
      'receivedAt',
    ]);
    expect(response.body.data.items[0]).toHaveProperty('metricType', 'systolic_bp');
  });

  test('POST /api/v1/biometrics validates payload', async () => {
    const response = await request(app)
      .post('/api/v1/biometrics')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'health_connect',
        readings: [],
      });

    expectFailureEnvelope(response, 400, 'Validasi request gagal');
    expect(response.body).toHaveProperty('details');
  });
});
