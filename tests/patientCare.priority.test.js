jest.mock('../src/repositories/patientCareRepository', () => ({
  listEmergencyContacts: jest.fn(),
  findPriorityEmergencyContact: jest.fn(),
  createEmergencyContact: jest.fn(),
  updateEmergencyContact: jest.fn(),
}));

const patientCareRepository = require('../src/repositories/patientCareRepository');
const patientCareService = require('../src/services/patientCareService');
const {
  emergencyContactCreateSchema,
  emergencyContactUpdateSchema,
} = require('../src/validators/patientCareValidator');

describe('patient care emergency contact priority', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('emergencyContactCreateSchema defaults isPriority to false', () => {
    expect(
      emergencyContactCreateSchema.parse({
        contactLabel: 'Ibu',
        contactNumber: '081234567890',
      })
    ).toEqual({
      contactLabel: 'Ibu',
      contactNumber: '081234567890',
      isPriority: false,
    });
  });

  test('emergencyContactUpdateSchema accepts priority-only update', () => {
    expect(
      emergencyContactUpdateSchema.parse({
        isPriority: true,
      })
    ).toEqual({
      isPriority: true,
    });
  });

  test('listEmergencyContacts maps isPriority in response', async () => {
    patientCareRepository.listEmergencyContacts.mockResolvedValue({
      items: [
        {
          emergency_contact_id: 'contact-1',
          user_id: 'user-1',
          contact_label: 'Ibu',
          contact_number: '081234567890',
          is_priority: true,
          created_at: '2026-04-11T00:00:00.000Z',
        },
      ],
      totalItems: 1,
    });

    const result = await patientCareService.listEmergencyContacts({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: {},
    });

    expect(result.items[0]).toMatchObject({
      emergencyContactId: 'contact-1',
      isPriority: true,
    });
  });

  test('createEmergencyContact rejects second priority contact', async () => {
    patientCareRepository.findPriorityEmergencyContact.mockResolvedValue({
      emergency_contact_id: 'contact-1',
    });

    await expect(
      patientCareService.createEmergencyContact({
        actor: { userId: 'user-1', role: 'patient' },
        userId: 'user-1',
        payload: {
          contactLabel: 'Ayah',
          contactNumber: '081200000001',
          isPriority: true,
        },
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Hanya satu emergency contact yang boleh menjadi prioritas',
    });

    expect(patientCareRepository.createEmergencyContact).not.toHaveBeenCalled();
  });

  test('createEmergencyContact allows first priority contact', async () => {
    patientCareRepository.findPriorityEmergencyContact.mockResolvedValue(null);
    patientCareRepository.createEmergencyContact.mockResolvedValue({
      emergency_contact_id: 'contact-2',
      user_id: 'user-1',
      contact_label: 'Ibu',
      contact_number: '081234567890',
      is_priority: true,
      created_at: '2026-04-11T00:00:00.000Z',
    });

    const result = await patientCareService.createEmergencyContact({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      payload: {
        contactLabel: 'Ibu',
        contactNumber: '081234567890',
        isPriority: true,
      },
    });

    expect(patientCareRepository.createEmergencyContact).toHaveBeenCalledWith({
      userId: 'user-1',
      contactLabel: 'Ibu',
      contactNumber: '081234567890',
      isPriority: true,
    });
    expect(result.isPriority).toBe(true);
  });

  test('updateEmergencyContact rejects promoting another contact while one priority exists', async () => {
    patientCareRepository.findPriorityEmergencyContact.mockResolvedValue({
      emergency_contact_id: 'contact-1',
    });

    await expect(
      patientCareService.updateEmergencyContact({
        actor: { userId: 'user-1', role: 'patient' },
        userId: 'user-1',
        emergencyContactId: 'contact-2',
        payload: {
          isPriority: true,
        },
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Hanya satu emergency contact yang boleh menjadi prioritas',
    });

    expect(patientCareRepository.updateEmergencyContact).not.toHaveBeenCalled();
  });
});
