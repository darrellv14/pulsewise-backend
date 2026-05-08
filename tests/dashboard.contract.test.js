const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const {
  expectObjectKeys,
  expectSuccessEnvelope,
} = require('./helpers/contractAssertions');

jest.mock('../src/services/careService', () => ({
  listDoctorDashboardPatients: jest.fn(),
  getDoctorDashboardPatientSummary: jest.fn(),
  getPatientSelfDashboardSummary: jest.fn(),
  getDoctorDashboardPatientVitals: jest.fn(),
  getPatientSelfDashboardVitals: jest.fn(),
  getDoctorDashboardAbnormalReport: jest.fn(),
  getPatientSelfDashboardAbnormalReport: jest.fn(),
  linkDoctorPatientByPatientId: jest.fn(),
  createDashboardPairingSession: jest.fn(),
  getDashboardPairingSessionStatus: jest.fn(),
  confirmDashboardPairingSession: jest.fn(),
}));

const careService = require('../src/services/careService');
const app = require('../src/app');

function issueDoctorToken(doctorId) {
  return jwt.sign(
    {
      userId: doctorId,
      email: 'doctor@pulsewise.local',
      role: 'doctor',
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
}

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

describe('Dashboard API contract', () => {
  const doctorId = '8aca6089-3899-4b85-a715-0a63113e846a';
  const patientId = '229f4f2c-a907-4c51-877a-c3f867453744';
  const pairingSessionId = '92d6f1bf-45ef-470f-a5a3-2f277f3138ca';
  const token = issueDoctorToken(doctorId);
  const patientToken = issuePatientToken(patientId);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET dashboard patients returns expected envelope contract', async () => {
    careService.listDoctorDashboardPatients.mockResolvedValue({
      items: [
        {
          patientId,
          firstName: 'Nadia',
          lastName: 'Saraswati',
          email: 'seed.patient2@pulsewise.local',
          dateOfBirth: '1994-09-03',
          age: 31,
          sex: 'female',
          latestVitals: {
            measuredAt: '2026-04-08T09:15:00.000Z',
            systolicBp: 122,
            diastolicBp: 80,
            heartRate: 79,
            oxygenSaturation: 98,
            weight: 61.2,
            height: 160,
            bmi: 23.9,
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });

    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/patients?page=1&limit=20`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Daftar pasien dashboard dokter berhasil diambil');
    expectObjectKeys(response.body.data, ['items', 'pagination']);
    expectObjectKeys(response.body.data.items[0], [
      'patientId',
      'firstName',
      'lastName',
      'email',
      'dateOfBirth',
      'age',
      'sex',
      'latestVitals',
    ]);
  });

  test('GET dashboard patient summary returns expected keys', async () => {
    careService.getDoctorDashboardPatientSummary.mockResolvedValue({
      patient: {
        patientId,
        firstName: 'Nadia',
        lastName: 'Saraswati',
        email: 'seed.patient2@pulsewise.local',
        phone: '081200000102',
        dateOfBirth: '1994-09-03',
        age: 31,
        sex: 'female',
      },
      latestVitals: {
        measuredAt: '2026-04-08T09:15:00.000Z',
        systolicBp: 122,
        diastolicBp: 80,
        heartRate: 79,
        oxygenSaturation: 98,
        weight: 61.2,
        height: 160,
        bmi: 23.9,
      },
      thresholds: {
        SPO2_CRITICAL_THRESHOLD: 90,
      },
    });

    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Ringkasan pasien dashboard dokter berhasil diambil');
    expectObjectKeys(response.body.data, ['patient', 'latestVitals', 'thresholds']);
  });

  test('GET patient self dashboard summary returns doctor-like shape', async () => {
    careService.getPatientSelfDashboardSummary.mockResolvedValue({
      patient: {
        patientId,
        firstName: 'Nadia',
        lastName: 'Saraswati',
        email: 'seed.patient2@pulsewise.local',
        phone: '081200000102',
        dateOfBirth: '1994-09-03',
        age: 31,
        sex: 'female',
      },
      latestVitals: {
        measuredAt: '2026-04-08T09:15:00.000Z',
        systolicBp: 122,
        diastolicBp: 80,
        heartRate: 79,
        oxygenSaturation: 98,
        weight: 61.2,
        height: 160,
        bmi: 23.9,
      },
      thresholds: {
        SPO2_CRITICAL_THRESHOLD: 90,
      },
    });

    const response = await request(app)
      .get(`/users/${patientId}/dashboard`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Ringkasan dashboard pasien berhasil diambil');
    expectObjectKeys(response.body.data, ['patient', 'latestVitals', 'thresholds']);
  });

  test('GET dashboard patient vitals returns stable shape', async () => {
    careService.getDoctorDashboardPatientVitals.mockResolvedValue({
      patient: {
        patientId,
        firstName: 'Nadia',
        lastName: 'Saraswati',
        email: 'seed.patient2@pulsewise.local',
        phone: '081200000102',
        dateOfBirth: '1994-09-03',
        age: 31,
        sex: 'female',
      },
      period: {
        startAt: '2026-04-01T00:00:00.000Z',
        endAt: '2026-04-30T23:59:59.999Z',
        timePeriod: 'custom',
      },
      series: {
        timestamps: ['2026-04-10T07:30:00.000Z'],
        systolicBp: [122],
        diastolicBp: [78],
        heartRate: [81],
        oxygenSaturation: [98],
        weight: [68.2],
        height: [172.5],
        bmi: [22.9],
      },
      latestVitals: {
        measuredAt: '2026-04-10T07:30:00.000Z',
        systolicBp: 122,
        diastolicBp: 78,
        heartRate: 81,
        oxygenSaturation: 98,
        weight: 68.2,
        height: 172.5,
        bmi: 22.9,
      },
      thresholds: {
        SPO2_CRITICAL_THRESHOLD: 90,
      },
    });

    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/patients/${patientId}/vitals?timePeriod=last_30_days`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Time-series vital pasien dashboard dokter berhasil diambil');
    expectObjectKeys(response.body.data, ['patient', 'period', 'series', 'latestVitals', 'thresholds']);
    expectObjectKeys(response.body.data.series, [
      'timestamps',
      'systolicBp',
      'diastolicBp',
      'heartRate',
      'oxygenSaturation',
      'weight',
      'height',
      'bmi',
    ]);
  });

  test('GET patient self dashboard vitals returns doctor-like shape', async () => {
    careService.getPatientSelfDashboardVitals.mockResolvedValue({
      patient: {
        patientId,
        firstName: 'Nadia',
        lastName: 'Saraswati',
        email: 'seed.patient2@pulsewise.local',
        phone: '081200000102',
        dateOfBirth: '1994-09-03',
        age: 31,
        sex: 'female',
      },
      period: {
        startAt: '2026-04-01T00:00:00.000Z',
        endAt: '2026-04-30T23:59:59.999Z',
        timePeriod: 'custom',
      },
      series: {
        timestamps: ['2026-04-10T07:30:00.000Z'],
        systolicBp: [122],
        diastolicBp: [78],
        heartRate: [81],
        oxygenSaturation: [98],
        weight: [68.2],
        height: [172.5],
        bmi: [22.9],
      },
      latestVitals: {
        measuredAt: '2026-04-10T07:30:00.000Z',
        systolicBp: 122,
        diastolicBp: 78,
        heartRate: 81,
        oxygenSaturation: 98,
        weight: 68.2,
        height: 172.5,
        bmi: 22.9,
      },
      thresholds: {
        SPO2_CRITICAL_THRESHOLD: 90,
      },
    });

    const response = await request(app)
      .get(`/users/${patientId}/dashboard/vitals?timePeriod=last_30_days`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Time-series vital dashboard pasien berhasil diambil');
    expectObjectKeys(response.body.data, ['patient', 'period', 'series', 'latestVitals', 'thresholds']);
  });

  test('GET dashboard abnormal report returns stable shape', async () => {
    careService.getDoctorDashboardAbnormalReport.mockResolvedValue({
      patient: {
        patientId,
        firstName: 'Nadia',
        lastName: 'Saraswati',
        email: 'seed.patient2@pulsewise.local',
        phone: '081200000102',
        dateOfBirth: '1994-09-03',
        age: 31,
        sex: 'female',
      },
      period: {
        startAt: '2026-04-01T00:00:00.000Z',
        endAt: '2026-04-30T23:59:59.999Z',
        timePeriod: 'custom',
      },
      stats: {
        systolicBp: { avg: 122, min: 122, max: 122 },
        diastolicBp: { avg: 78, min: 78, max: 78 },
        heartRate: { avg: 81, min: 81, max: 81 },
        oxygenSaturation: { avg: 98, min: 98, max: 98 },
        weight: { avg: 68.2, min: 68.2, max: 68.2 },
        bmi: { avg: 22.9, min: 22.9, max: 22.9 },
      },
      abnormalInstances: [],
      thresholds: {
        SPO2_CRITICAL_THRESHOLD: 90,
      },
    });

    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/patients/${patientId}/abnormal-report?timePeriod=last_30_days`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Abnormal report pasien dashboard dokter berhasil diambil');
    expectObjectKeys(response.body.data, ['patient', 'period', 'stats', 'abnormalInstances', 'thresholds']);
  });

  test('GET patient self dashboard abnormal report returns doctor-like shape', async () => {
    careService.getPatientSelfDashboardAbnormalReport.mockResolvedValue({
      patient: {
        patientId,
        firstName: 'Nadia',
        lastName: 'Saraswati',
        email: 'seed.patient2@pulsewise.local',
        phone: '081200000102',
        dateOfBirth: '1994-09-03',
        age: 31,
        sex: 'female',
      },
      period: {
        startAt: '2026-04-01T00:00:00.000Z',
        endAt: '2026-04-30T23:59:59.999Z',
        timePeriod: 'custom',
      },
      stats: {
        systolicBp: { avg: 122, min: 122, max: 122 },
        diastolicBp: { avg: 78, min: 78, max: 78 },
        heartRate: { avg: 81, min: 81, max: 81 },
        oxygenSaturation: { avg: 98, min: 98, max: 98 },
        weight: { avg: 68.2, min: 68.2, max: 68.2 },
        bmi: { avg: 22.9, min: 22.9, max: 22.9 },
      },
      abnormalInstances: [],
      thresholds: {
        SPO2_CRITICAL_THRESHOLD: 90,
      },
    });

    const response = await request(app)
      .get(`/users/${patientId}/dashboard/abnormal-report?timePeriod=last_30_days`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Abnormal report dashboard pasien berhasil diambil');
    expectObjectKeys(response.body.data, ['patient', 'period', 'stats', 'abnormalInstances', 'thresholds']);
  });

  test('POST link by scanned patientId returns expected envelope contract', async () => {
    careService.linkDoctorPatientByPatientId.mockResolvedValue({
      doctor_id: doctorId,
      patient_id: patientId,
      source: 'qr_patient_id',
      is_active: true,
      linked_at: '2026-04-09T10:30:00.000Z',
    });

    const response = await request(app)
      .post(`/doctors/${doctorId}/patients/link-by-patient-id`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('doctor_id');
    expect(response.body.data).toHaveProperty('patient_id');
    expect(response.body.data).toHaveProperty('source');
  });

  test('POST create dashboard pairing session returns token payload', async () => {
    careService.createDashboardPairingSession.mockResolvedValue({
      pairingSessionId,
      doctorId,
      status: 'pending',
      expiresAt: '2026-04-09T12:10:00.000Z',
      pairingToken: 'PWDASH-ABCDEF0123456789',
      qrPayload: 'PWDASH-ABCDEF0123456789',
      pollingPath: `/doctors/${doctorId}/dashboard/pairing-sessions/${pairingSessionId}`,
    });

    const response = await request(app)
      .post(`/doctors/${doctorId}/dashboard/pairing-sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        expiresInSeconds: 90,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('pairingSessionId');
    expect(response.body.data).toHaveProperty('pairingToken');
    expect(response.body.data).toHaveProperty('qrPayload');
  });

  test('GET pairing session events streams SSE payload', async () => {
    careService.getDashboardPairingSessionStatus.mockResolvedValue({
      pairingSessionId,
      doctorId,
      status: 'confirmed',
      expiresAt: '2026-04-09T12:10:00.000Z',
      confirmedAt: '2026-04-09T12:09:05.000Z',
      patientId,
    });

    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/pairing-sessions/${pairingSessionId}/events`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('event: pairing-status');
    expect(response.text).toContain('"status":"confirmed"');
  });

  test('POST confirm dashboard pairing session returns expected envelope', async () => {
    careService.confirmDashboardPairingSession.mockResolvedValue({
      pairingSessionId,
      status: 'confirmed',
      doctorId,
      patientId,
      confirmedAt: '2026-04-09T12:09:05.000Z',
      doctorPatientLink: {
        doctor_id: doctorId,
        patient_id: patientId,
        source: 'qr_dashboard_pairing',
      },
    });

    const response = await request(app)
      .post('/dashboard/pairing-sessions/confirm')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        pairingToken: 'PWDASH-ABCDEF0123456789ABCDEF0123456789',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('pairingSessionId');
    expect(response.body.data).toHaveProperty('status', 'confirmed');
    expect(response.body.data).toHaveProperty('doctorPatientLink');
  });

  test('POST confirm dashboard pairing session supports idempotent 200 response', async () => {
    careService.confirmDashboardPairingSession.mockResolvedValue({
      pairingSessionId,
      status: 'expired',
      doctorId,
      patientId: null,
      confirmedAt: null,
      doctorPatientLink: null,
      httpStatus: 200,
    });

    const response = await request(app)
      .post('/dashboard/pairing-sessions/confirm')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        pairingToken: 'PWDASH-ABCDEF0123456789ABCDEF0123456789',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('status', 'expired');
    expect(response.body.data).not.toHaveProperty('httpStatus');
  });
});
