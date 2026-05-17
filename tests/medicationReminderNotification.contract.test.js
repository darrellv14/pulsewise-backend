const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const {
  expectObjectKeys,
  expectSuccessEnvelope,
  expectFailureEnvelope,
} = require('./helpers/contractAssertions');

jest.mock('../src/services/medicationService', () => ({
  listMedications: jest.fn(),
  listMedicationCalendar: jest.fn(),
  getMedicationById: jest.fn(),
  createMedication: jest.fn(),
  updateMedication: jest.fn(),
  deleteMedication: jest.fn(),
  listRemindersByMedication: jest.fn(),
  createReminder: jest.fn(),
  updateReminder: jest.fn(),
  deleteReminder: jest.fn(),
  listMedicationLogs: jest.fn(),
  createMedicationLog: jest.fn(),
  sendMedicationReminderNotification: jest.fn(),
}));

const medicationService = require('../src/services/medicationService');
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

describe('Medication reminder notification contract', () => {
  const userId = '229f4f2c-a907-4c51-877a-c3f867453744';
  const medicationId = '0f282e3e-2d3c-494b-bc6f-e204c7e3e3d5';
  const token = issueToken({ userId, role: 'patient' });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /users/:userId/medications/:medicationId/reminder-notification returns send summary contract', async () => {
    medicationService.sendMedicationReminderNotification.mockResolvedValue({
      userId,
      notificationType: 'medication_reminder',
      sentCount: 1,
      failedCount: 0,
      results: [
        {
          fcmTokenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          platform: 'android',
          status: 'sent',
          messageId: 'projects/pulse-wise-app/messages/med-1',
        },
      ],
    });

    const response = await request(app)
      .post(`/users/${userId}/medications/${medicationId}/reminder-notification`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        reminderId: '11111111-1111-4111-8111-111111111111',
        scheduledDate: '2026-05-17',
        status: 'Open',
      });

    expect(response.status).toBe(200);
    expectSuccessEnvelope(response, 'Medication reminder notification berhasil dikirim');
    expectObjectKeys(response.body.data, [
      'userId',
      'notificationType',
      'sentCount',
      'failedCount',
      'results',
    ]);
    expectObjectKeys(response.body.data.results[0], [
      'fcmTokenId',
      'platform',
      'status',
      'messageId',
    ]);
  });

  test('POST /users/:userId/medications/:medicationId/reminder-notification validates payload', async () => {
    const response = await request(app)
      .post(`/users/${userId}/medications/${medicationId}/reminder-notification`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        scheduledDate: '2026-05-17',
      });

    expectFailureEnvelope(response, 400, 'Validasi request gagal');
  });
});
