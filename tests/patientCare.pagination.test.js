jest.mock('../src/repositories/patientCareRepository', () => ({
  listEmergencyContacts: jest.fn(),
  listHeartDiaries: jest.fn(),
}));

const patientCareRepository = require('../src/repositories/patientCareRepository');
const patientCareService = require('../src/services/patientCareService');

describe('patient care pagination', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('listEmergencyContacts returns paginated response', async () => {
    patientCareRepository.listEmergencyContacts.mockResolvedValue({
      items: [
        {
          emergency_contact_id: 'contact-1',
          user_id: 'user-1',
          contact_label: 'Ibu',
          contact_number: '081234567890',
          created_at: '2026-04-11T00:00:00.000Z',
        },
      ],
      totalItems: 6,
    });

    const result = await patientCareService.listEmergencyContacts({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: { page: 2, limit: 2 },
    });

    expect(patientCareRepository.listEmergencyContacts).toHaveBeenCalledWith({
      userId: 'user-1',
      limit: 2,
      offset: 2,
    });
    expect(result.pagination).toEqual({
      page: 2,
      limit: 2,
      totalItems: 6,
      totalPages: 3,
    });
    expect(result.items[0].emergencyContactId).toBe('contact-1');
  });

  test('listHeartDiaries paginates while keeping date filters', async () => {
    patientCareRepository.listHeartDiaries.mockResolvedValue({
      items: [
        {
          diary_id: 'diary-1',
          user_id: 'user-1',
          diary_date: '2026-04-10',
          created_at: '2026-04-10T09:00:00.000Z',
        },
      ],
      totalItems: 9,
    });

    const result = await patientCareService.listHeartDiaries({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: {
        page: 3,
        limit: 3,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      },
    });

    expect(patientCareRepository.listHeartDiaries).toHaveBeenCalledWith({
      userId: 'user-1',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      limit: 3,
      offset: 6,
    });
    expect(result.pagination).toEqual({
      page: 3,
      limit: 3,
      totalItems: 9,
      totalPages: 3,
    });
    expect(result.items[0].diaryId).toBe('diary-1');
  });

  test('listEmergencyContacts coerces string pagination input', async () => {
    patientCareRepository.listEmergencyContacts.mockResolvedValue({
      items: [],
      totalItems: 0,
    });

    const result = await patientCareService.listEmergencyContacts({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: { page: '1', limit: '20' },
    });

    expect(patientCareRepository.listEmergencyContacts).toHaveBeenCalledWith({
      userId: 'user-1',
      limit: 20,
      offset: 0,
    });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 1,
    });
  });
});
