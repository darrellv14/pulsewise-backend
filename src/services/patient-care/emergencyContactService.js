const { CONFLICT, NOT_FOUND } = require('../../constants/httpStatus');
const patientCareRepository = require('../../repositories/patientCareRepository');
const { buildPagination, normalizePaginationInput } = require('../../utils/pagination');
const { createHttpError } = require('../../utils/httpError');
const { assertUserScope } = require('./shared');
const { mapEmergencyContact, isEmergencyPriorityConflictError } = require('./mappers');

async function listEmergencyContacts({ actor, userId, query }) {
  assertUserScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const offset = (page - 1) * limit;

  const result = await patientCareRepository.listEmergencyContacts({
    userId,
    limit,
    offset,
  });

  return {
    items: result.items.map(mapEmergencyContact),
    pagination: buildPagination({ page, limit, totalItems: result.totalItems }),
  };
}

async function createEmergencyContact({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  if (payload.isPriority) {
    const existingPriority = await patientCareRepository.findPriorityEmergencyContact({ userId });
    if (existingPriority) {
      throw createHttpError('Hanya satu emergency contact yang boleh menjadi prioritas', CONFLICT);
    }
  }

  try {
    const created = await patientCareRepository.createEmergencyContact({
      userId,
      contactLabel: payload.contactLabel,
      contactNumber: payload.contactNumber,
      isPriority: payload.isPriority,
    });

    return mapEmergencyContact(created);
  } catch (error) {
    if (isEmergencyPriorityConflictError(error)) {
      throw createHttpError('Hanya satu emergency contact yang boleh menjadi prioritas', CONFLICT);
    }

    throw error;
  }
}

async function updateEmergencyContact({ actor, userId, emergencyContactId, payload }) {
  assertUserScope({ actor, userId });

  if (payload.isPriority) {
    const existingPriority = await patientCareRepository.findPriorityEmergencyContact({
      userId,
      excludeEmergencyContactId: emergencyContactId,
    });
    if (existingPriority) {
      throw createHttpError('Hanya satu emergency contact yang boleh menjadi prioritas', CONFLICT);
    }
  }

  try {
    const updated = await patientCareRepository.updateEmergencyContact({
      userId,
      emergencyContactId,
      contactLabel: payload.contactLabel !== undefined ? payload.contactLabel : null,
      contactNumber: payload.contactNumber !== undefined ? payload.contactNumber : null,
      isPriority: payload.isPriority !== undefined ? payload.isPriority : null,
    });

    if (!updated) {
      throw createHttpError('Emergency contact tidak ditemukan', NOT_FOUND);
    }

    return mapEmergencyContact(updated);
  } catch (error) {
    if (isEmergencyPriorityConflictError(error)) {
      throw createHttpError('Hanya satu emergency contact yang boleh menjadi prioritas', CONFLICT);
    }

    throw error;
  }
}

async function deleteEmergencyContact({ actor, userId, emergencyContactId }) {
  assertUserScope({ actor, userId });

  const deletedCount = await patientCareRepository.deleteEmergencyContact({
    userId,
    emergencyContactId,
  });

  if (!deletedCount) {
    throw createHttpError('Emergency contact tidak ditemukan', NOT_FOUND);
  }

  return {
    emergencyContactId,
  };
}

module.exports = {
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
};
