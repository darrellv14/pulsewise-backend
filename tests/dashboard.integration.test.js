const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');

function issueToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: '1h',
  });
}

describe('Doctor dashboard endpoint guards', () => {
  const doctorId = '11111111-1111-4111-8111-111111111111';
  const otherDoctorId = '22222222-2222-4222-8222-222222222222';
  const patientId = '33333333-3333-4333-8333-333333333333';
  const pairingSessionId = '44444444-4444-4444-8444-444444444444';

  test('unauthorized: dashboard patient list without token', async () => {
    const response = await request(app).get(`/doctors/${doctorId}/dashboard/patients`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Token tidak ditemukan');
  });

  test('unauthorized: dashboard patient list with malformed token', async () => {
    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/patients`)
      .set('Authorization', 'Bearer token-invalid-format');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Token tidak valid');
  });

  test('unauthorized: dashboard patient list with expired token', async () => {
    const expiredToken = jwt.sign(
      {
        userId: doctorId,
        email: 'doctor@example.com',
        role: 'doctor',
      },
      env.jwtSecret,
      { expiresIn: -1 }
    );

    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/patients`)
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Token tidak valid');
  });

  test('forbidden: patient role cannot access doctor dashboard', async () => {
    const token = issueToken({
      userId: doctorId,
      email: 'patient@example.com',
      role: 'patient',
    });

    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/patients`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Role tidak memiliki akses dashboard dokter');
  });

  test('forbidden: doctor token cannot access another doctor scope', async () => {
    const token = issueToken({
      userId: otherDoctorId,
      email: 'doctor@example.com',
      role: 'doctor',
    });

    const response = await request(app)
      .get(`/doctors/${doctorId}/dashboard/patients`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Akses dashboard dokter ditolak');
  });

  test('invalid query: unsupported timePeriod rejected before handler', async () => {
    const token = issueToken({
      userId: doctorId,
      email: 'doctor@example.com',
      role: 'doctor',
    });

    const response = await request(app)
      .get(
        `/doctors/${doctorId}/dashboard/patients/${patientId}/vitals?timePeriod=last_90_days`
      )
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validasi request gagal');
  });

  test('unauthorized: link-by-patient-id without token', async () => {
    const response = await request(app)
      .post(`/doctors/${doctorId}/patients/link-by-patient-id`)
      .send({
        patientId,
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Token tidak ditemukan');
  });

  test('invalid body: link-by-patient-id with malformed patientId', async () => {
    const token = issueToken({
      userId: doctorId,
      email: 'doctor@example.com',
      role: 'doctor',
    });

    const response = await request(app)
      .post(`/doctors/${doctorId}/patients/link-by-patient-id`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'not-a-uuid',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validasi request gagal');
  });

  test('unauthorized: create dashboard pairing session without token', async () => {
    const response = await request(app)
      .post(`/doctors/${doctorId}/dashboard/pairing-sessions`)
      .send({
        expiresInSeconds: 90,
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Token tidak ditemukan');
  });

  test('invalid payload: create pairing session with invalid expiresInSeconds', async () => {
    const token = issueToken({
      userId: doctorId,
      email: 'doctor@example.com',
      role: 'doctor',
    });

    const response = await request(app)
      .post(`/doctors/${doctorId}/dashboard/pairing-sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        expiresInSeconds: 10,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validasi request gagal');
  });

  test('unauthorized: pairing session SSE stream without token', async () => {
    const response = await request(app).get(
      `/doctors/${doctorId}/dashboard/pairing-sessions/${pairingSessionId}/events`
    );

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Token tidak ditemukan');
  });

  test('forbidden: only patient can confirm dashboard pairing', async () => {
    const token = issueToken({
      userId: doctorId,
      email: 'doctor@example.com',
      role: 'doctor',
    });

    const response = await request(app)
      .post('/dashboard/pairing-sessions/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        pairingToken: 'PWDASH-INVALID-TOKEN-ABCDEF0123456789',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Hanya pasien yang dapat mengonfirmasi pairing dashboard');
  });
});
