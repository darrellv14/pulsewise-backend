const { NOT_FOUND } = require('../../constants/httpStatus');
const { createHttpError } = require('../../utils/httpError');
const {
  assertDoctorScope,
  assertPatientScope,
  assertDoctorPatientLinkedAccess,
} = require('../shared/guards');

const INFERENCE_TYPES = {
  prediction: 'prediction',
  recommendation: 'recommendation',
};

async function assertPatientRouteAccess({ actor, userId }) {
  assertPatientScope({
    actor,
    patientId: userId,
    messages: {
      roleDenied: 'Akses endpoint ML pasien ditolak',
      scopeDenied: 'Akses endpoint ML pasien ditolak',
    },
  });
}

async function assertDoctorDashboardRouteAccess({ actor, doctorId, patientId }) {
  assertDoctorScope({
    actor,
    doctorId,
    messages: {
      roleDenied: 'Akses dashboard dokter ditolak',
      scopeDenied: 'Akses dashboard dokter ditolak',
    },
  });

  await assertDoctorPatientLinkedAccess({ doctorId, patientId });
}

function resolveInferenceLabels(inferenceType) {
  if (inferenceType === INFERENCE_TYPES.prediction) {
    return {
      singular: 'Prediksi',
      notFound: 'Riwayat prediksi ML pasien belum tersedia',
      detailNotFound: 'Detail riwayat prediksi ML pasien tidak ditemukan',
      success: 'Prediksi',
      endpointPath: '/predictions/',
    };
  }

  return {
    singular: 'Rekomendasi',
    notFound: 'Riwayat rekomendasi ML pasien belum tersedia',
    detailNotFound: 'Detail riwayat rekomendasi ML pasien tidak ditemukan',
    success: 'Rekomendasi',
    endpointPath: '/recommendations/',
  };
}

function ensureLatestResult(result, inferenceType) {
  if (!result) {
    throw createHttpError(resolveInferenceLabels(inferenceType).notFound, NOT_FOUND);
  }

  return result;
}

function ensureHistoryDetailResult(result, inferenceType) {
  if (!result) {
    throw createHttpError(resolveInferenceLabels(inferenceType).detailNotFound, NOT_FOUND);
  }

  return result;
}

module.exports = {
  INFERENCE_TYPES,
  assertPatientRouteAccess,
  assertDoctorDashboardRouteAccess,
  resolveInferenceLabels,
  ensureLatestResult,
  ensureHistoryDetailResult,
};
