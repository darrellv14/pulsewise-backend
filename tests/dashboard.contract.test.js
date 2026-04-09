const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');

jest.mock('../src/services/phase2Service', () => ({
  listDoctorDashboardPatients: jest.fn(),
  getDoctorDashboardPatientSummary: jest.fn(),
  getDoctorDashboardPatientVitals: jest.fn(),
  getDoctorDashboardAbnormalReport: jest.fn(),
  linkDoctorPatientByPatientId: jest.fn(),
  createDashboardPairingSession: jest.fn(),
  getDashboardPairingSessionStatus: jest.fn(),
  confirmDashboardPairingSession: jest.fn(),
}));

const phase2Service = require('../src/services/phase2Service');
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
    phase2Service.listDoctorDashboardPatients.mockResolvedValue({
      items: [
        {
          patientId,
          firstName: 'Nadia',
          lastName: 'Saraswati',
          email: 'seed.patient2@pulsewise.local',
          dateOfBirth: '1994-09-03',
          sex: 'female',
          latestVitals: {
            measuredAt: '2026-04-08T09:15:00.000Z',
            systolicBp: 122,
            diastolicBp: 80,
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
      .get(`/api/v1/doctors/${doctorId}/dashboard/patients?page=1&limit=20`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('items');
    expect(response.body.data).toHaveProperty('pagination');
    expect(response.body.data.items[0]).toHaveProperty('patientId');
    expect(response.body.data.items[0]).toHaveProperty('latestVitals');
  });

  test('GET dashboard patient summary returns expected keys', async () => {
    phase2Service.getDoctorDashboardPatientSummary.mockResolvedValue({
      patient: {
        patientId,
        firstName: 'Nadia',
        lastName: 'Saraswati',
        email: 'seed.patient2@pulsewise.local',
        phone: '081200000102',
        dateOfBirth: '1994-09-03',
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
      .get(`/api/v1/doctors/${doctorId}/dashboard/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('patient');
    expect(response.body.data).toHaveProperty('latestVitals');
    expect(response.body.data).toHaveProperty('thresholds');
  });

  test('POST link by scanned patientId returns expected envelope contract', async () => {
    phase2Service.linkDoctorPatientByPatientId.mockResolvedValue({
      doctor_id: doctorId,
      patient_id: patientId,
      source: 'qr_patient_id',
      is_active: true,
      linked_at: '2026-04-09T10:30:00.000Z',
    });

    const response = await request(app)
      .post(`/api/v1/doctors/${doctorId}/patients/link-by-patient-id`)
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
    phase2Service.createDashboardPairingSession.mockResolvedValue({
      pairingSessionId,
      doctorId,
      status: 'pending',
      expiresAt: '2026-04-09T12:10:00.000Z',
      pairingToken: 'PWDASH-ABCDEF0123456789',
      qrPayload: 'PWDASH-ABCDEF0123456789',
      pollingPath: `/api/v1/doctors/${doctorId}/dashboard/pairing-sessions/${pairingSessionId}`,
    });

    const response = await request(app)
      .post(`/api/v1/doctors/${doctorId}/dashboard/pairing-sessions`)
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
    phase2Service.getDashboardPairingSessionStatus.mockResolvedValue({
      pairingSessionId,
      doctorId,
      status: 'confirmed',
      expiresAt: '2026-04-09T12:10:00.000Z',
      confirmedAt: '2026-04-09T12:09:05.000Z',
      patientId,
    });

    const response = await request(app)
      .get(`/api/v1/doctors/${doctorId}/dashboard/pairing-sessions/${pairingSessionId}/events`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('event: pairing-status');
    expect(response.text).toContain('"status":"confirmed"');
  });

  test('POST confirm dashboard pairing session returns expected envelope', async () => {
    phase2Service.confirmDashboardPairingSession.mockResolvedValue({
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
      .post('/api/v1/dashboard/pairing-sessions/confirm')
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
});
