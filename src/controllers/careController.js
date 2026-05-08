const { success } = require('../utils/response');
const careService = require('../services/careService');
const { CREATED } = require('../constants/httpStatus');
const { PAIRING_TERMINAL_STATUSES } = require('../constants/enums');
const DASHBOARD_PAIRING_SSE_POLL_MS = 2000;
const DASHBOARD_PAIRING_SSE_PING_MS = 15000;

function writeSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function listPatients(req, res, next) {
  try {
    const data = await careService.listPatients(req.query);
    return success(res, 'Daftar pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientProfile(req, res, next) {
  try {
    const data = await careService.getPatientProfile(req.params.patientId);
    return success(res, 'Profil pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function updatePatientProfile(req, res, next) {
  try {
    const data = await careService.updatePatientProfile(req.params.patientId, req.body);
    return success(res, 'Profil pasien berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientMlProfile(req, res, next) {
  try {
    const data = await careService.getPatientMlProfile({
      actor: req.user,
      patientId: req.params.patientId,
    });
    return success(res, 'ML profile pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function updatePatientMlProfile(req, res, next) {
  try {
    const data = await careService.updatePatientMlProfile({
      actor: req.user,
      patientId: req.params.patientId,
      payload: req.body,
    });
    return success(res, 'ML profile pasien berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function getLatestPatientMlAssessment(req, res, next) {
  try {
    const data = await careService.getLatestPatientMlAssessment({
      actor: req.user,
      patientId: req.params.patientId,
    });
    return success(res, 'Assessment ML terbaru berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listPatientMlAssessments(req, res, next) {
  try {
    const data = await careService.listPatientMlAssessments({
      actor: req.user,
      patientId: req.params.patientId,
      query: req.query,
    });
    return success(res, 'Daftar assessment ML berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createPatientMlAssessment(req, res, next) {
  try {
    const data = await careService.createPatientMlAssessment({
      actor: req.user,
      patientId: req.params.patientId,
      payload: req.body,
    });
    return success(res, 'Assessment ML berhasil dibuat', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function updatePatientMlAssessment(req, res, next) {
  try {
    const data = await careService.updatePatientMlAssessment({
      actor: req.user,
      patientId: req.params.patientId,
      assessmentId: req.params.assessmentId,
      payload: req.body,
    });
    return success(res, 'Assessment ML berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorProfile(req, res, next) {
  try {
    const data = await careService.getDoctorProfile(req.params.doctorId);
    return success(res, 'Profil dokter berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function updateDoctorProfile(req, res, next) {
  try {
    const data = await careService.updateDoctorProfile(req.params.doctorId, req.body);
    return success(res, 'Profil dokter berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function listDoctorPatients(req, res, next) {
  try {
    const data = await careService.listDoctorPatients({
      doctorId: req.params.doctorId,
      page: req.query.page,
      limit: req.query.limit,
    });

    return success(res, 'Relasi pasien dokter berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function linkDoctorPatient(req, res, next) {
  try {
    const data = await careService.linkDoctorPatient({
      doctorId: req.params.doctorId,
      patientId: req.body.patientId,
      source: req.body.source,
    });

    return success(res, 'Relasi dokter-pasien berhasil dibuat', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function createPatientShare(req, res, next) {
  try {
    const data = await careService.createPatientShare({
      actor: req.user,
      patientId: req.params.patientId,
      expiresInHours: req.body.expiresInHours,
    });

    return success(res, 'Share code pasien berhasil dibuat', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function linkDoctorPatientByShareCode(req, res, next) {
  try {
    const data = await careService.linkDoctorPatientByShareCode({
      actor: req.user,
      doctorId: req.params.doctorId,
      shareCode: req.body.shareCode,
    });

    return success(res, 'Relasi dokter-pasien berhasil dibuat dari share code', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function linkDoctorPatientByPatientId(req, res, next) {
  try {
    const data = await careService.linkDoctorPatientByPatientId({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.body.patientId,
      source: req.body.source,
    });

    return success(res, 'Relasi dokter-pasien berhasil dibuat dari scan patient ID', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function createDashboardPairingSession(req, res, next) {
  try {
    const data = await careService.createDashboardPairingSession({
      actor: req.user,
      doctorId: req.params.doctorId,
      expiresInSeconds: req.body.expiresInSeconds,
    });

    return success(res, 'Session pairing dashboard berhasil dibuat', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function getDashboardPairingSessionStatus(req, res, next) {
  try {
    const data = await careService.getDashboardPairingSessionStatus({
      actor: req.user,
      doctorId: req.params.doctorId,
      pairingSessionId: req.params.pairingSessionId,
    });

    return success(res, 'Status pairing dashboard berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function streamDashboardPairingSessionStatus(req, res, next) {
  let pollTimer = null;
  let pingTimer = null;

  const cleanup = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  const sendCurrentStatus = async () => {
    const statusData = await careService.getDashboardPairingSessionStatus({
      actor: req.user,
      doctorId: req.params.doctorId,
      pairingSessionId: req.params.pairingSessionId,
    });

    writeSseEvent(res, 'pairing-status', statusData);

    if (PAIRING_TERMINAL_STATUSES.has(statusData.status)) {
      cleanup();
      res.end();
    }
  };

  const handleStreamError = (error) => {
    cleanup();

    if (!res.headersSent) {
      return next(error);
    }

    if (!res.writableEnded) {
      writeSseEvent(res, 'error', {
        message: error.message || 'Terjadi kesalahan pada stream status pairing',
      });
      res.end();
    }

    return undefined;
  };

  try {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    req.on('close', () => {
      cleanup();
    });

    await sendCurrentStatus();
    if (res.writableEnded) {
      return undefined;
    }

    pollTimer = setInterval(() => {
      sendCurrentStatus().catch(handleStreamError);
    }, DASHBOARD_PAIRING_SSE_POLL_MS);

    pingTimer = setInterval(() => {
      if (!res.writableEnded) {
        writeSseEvent(res, 'ping', {});
      }
    }, DASHBOARD_PAIRING_SSE_PING_MS);

    return undefined;
  } catch (error) {
    return handleStreamError(error);
  }
}

async function confirmDashboardPairingSession(req, res, next) {
  try {
    const data = await careService.confirmDashboardPairingSession({
      actor: req.user,
      pairingToken: req.body.pairingToken,
      source: req.body.source,
    });

    const statusCode = data.httpStatus || CREATED;
    const { httpStatus: _httpStatus, ...responseData } = data;

    return success(
      res,
      'Pairing dashboard berhasil dikonfirmasi dari mobile',
      responseData,
      statusCode
    );
  } catch (error) {
    return next(error);
  }
}

async function unlinkDoctorPatient(req, res, next) {
  try {
    const data = await careService.unlinkDoctorPatient({
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
    });

    return success(res, 'Relasi dokter-pasien berhasil dinonaktifkan', data);
  } catch (error) {
    return next(error);
  }
}

async function listDoctorDashboardPatients(req, res, next) {
  try {
    const data = await careService.listDoctorDashboardPatients({
      actor: req.user,
      doctorId: req.params.doctorId,
      query: req.query,
    });

    return success(res, 'Daftar pasien dashboard dokter berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientSummary(req, res, next) {
  try {
    const data = await careService.getDoctorDashboardPatientSummary({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
    });

    return success(res, 'Ringkasan pasien dashboard dokter berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientSelfDashboardSummary(req, res, next) {
  try {
    const data = await careService.getPatientSelfDashboardSummary({
      actor: req.user,
      userId: req.params.userId,
    });

    return success(res, 'Ringkasan dashboard pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardPatientVitals(req, res, next) {
  try {
    const data = await careService.getDoctorDashboardPatientVitals({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      query: req.query,
    });

    return success(res, 'Time-series vital pasien dashboard dokter berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientSelfDashboardVitals(req, res, next) {
  try {
    const data = await careService.getPatientSelfDashboardVitals({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Time-series vital dashboard pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getDoctorDashboardAbnormalReport(req, res, next) {
  try {
    const data = await careService.getDoctorDashboardAbnormalReport({
      actor: req.user,
      doctorId: req.params.doctorId,
      patientId: req.params.patientId,
      query: req.query,
    });

    return success(res, 'Abnormal report pasien dashboard dokter berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPatientSelfDashboardAbnormalReport(req, res, next) {
  try {
    const data = await careService.getPatientSelfDashboardAbnormalReport({
      actor: req.user,
      userId: req.params.userId,
      query: req.query,
    });

    return success(res, 'Abnormal report dashboard pasien berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPatients,
  getPatientProfile,
  updatePatientProfile,
  getPatientMlProfile,
  updatePatientMlProfile,
  getLatestPatientMlAssessment,
  listPatientMlAssessments,
  createPatientMlAssessment,
  updatePatientMlAssessment,
  getDoctorProfile,
  updateDoctorProfile,
  listDoctorPatients,
  linkDoctorPatient,
  createPatientShare,
  linkDoctorPatientByShareCode,
  linkDoctorPatientByPatientId,
  createDashboardPairingSession,
  getDashboardPairingSessionStatus,
  streamDashboardPairingSessionStatus,
  confirmDashboardPairingSession,
  unlinkDoctorPatient,
  listDoctorDashboardPatients,
  getDoctorDashboardPatientSummary,
  getPatientSelfDashboardSummary,
  getDoctorDashboardPatientVitals,
  getPatientSelfDashboardVitals,
  getDoctorDashboardAbnormalReport,
  getPatientSelfDashboardAbnormalReport,
};
