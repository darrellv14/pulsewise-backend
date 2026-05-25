const { success } = require('../utils/response');
const adminService = require('../services/adminService');

async function getOverview(req, res, next) {
  try {
    const data = await adminService.getOverview({ actor: req.user });
    return success(res, 'Ringkasan admin berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const data = await adminService.listUsers({ actor: req.user, query: req.query });
    return success(res, 'Daftar user berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const data = await adminService.getUserById({ actor: req.user, userId: req.params.userId });
    return success(res, 'Detail user berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const data = await adminService.updateUserStatus({
      actor: req.user,
      userId: req.params.userId,
      accountStatus: req.body.accountStatus,
    });
    return success(res, 'Status user berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function listDoctorsPending(req, res, next) {
  try {
    const data = await adminService.listDoctorsPending({ actor: req.user });
    return success(res, 'Daftar dokter pending berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listDoctors(req, res, next) {
  try {
    const data = await adminService.listDoctors({ actor: req.user, query: req.query });
    return success(res, 'Daftar dokter berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorById(req, res, next) {
  try {
    const data = await adminService.getDoctorById({
      actor: req.user,
      doctorId: req.params.doctorId,
    });
    return success(res, 'Detail dokter berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function approveDoctor(req, res, next) {
  try {
    const data = await adminService.approveDoctor({
      actor: req.user,
      doctorId: req.params.doctorId,
      payload: req.body,
    });
    return success(res, 'Dokter berhasil diverifikasi admin', data);
  } catch (error) {
    return next(error);
  }
}

async function rejectDoctor(req, res, next) {
  try {
    const data = await adminService.rejectDoctor({
      actor: req.user,
      doctorId: req.params.doctorId,
      payload: req.body,
    });
    return success(res, 'Dokter berhasil ditolak admin', data);
  } catch (error) {
    return next(error);
  }
}

async function suspendDoctor(req, res, next) {
  try {
    const data = await adminService.suspendDoctor({
      actor: req.user,
      doctorId: req.params.doctorId,
      payload: req.body,
    });
    return success(res, 'Dokter berhasil disuspend admin', data);
  } catch (error) {
    return next(error);
  }
}

async function reactivateDoctor(req, res, next) {
  try {
    const data = await adminService.reactivateDoctor({
      actor: req.user,
      doctorId: req.params.doctorId,
    });
    return success(res, 'Dokter berhasil diaktifkan kembali', data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOverview,
  listUsers,
  getUserById,
  updateUserStatus,
  listDoctorsPending,
  listDoctors,
  getDoctorById,
  approveDoctor,
  rejectDoctor,
  suspendDoctor,
  reactivateDoctor,
};
