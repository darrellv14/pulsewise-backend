const crypto = require('crypto');
const { NOT_FOUND, FORBIDDEN, CREATED, OK } = require('../constants/httpStatus');
const { PAIRING_STATUSES } = require('../constants/enums');
const doctorPatientRepository = require('../repositories/doctorPatientRepository');
const dashboardPairingRepository = require('../repositories/dashboardPairingRepository');
const { assertDoctorScope } = require('./shared/guards');

const DEFAULT_PAIRING_SOURCE = 'qr_dashboard_pairing';

function toIso(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function assertPatientActor(actor) {
  if (!actor) {
    const error = new Error('Aktor tidak valid');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  if (actor.role !== 'patient') {
    const error = new Error('Hanya pasien yang dapat mengonfirmasi pairing dashboard');
    error.statusCode = FORBIDDEN;
    throw error;
  }

  return actor.userId;
}

function generateDashboardPairingToken() {
  return `PWDASH-${crypto.randomBytes(18).toString('hex').toUpperCase()}`;
}

function hashPairingToken(pairingToken) {
  return crypto
    .createHash('sha256')
    .update(String(pairingToken || '').trim())
    .digest('hex');
}

function buildPairingTokenNotFoundError() {
  const error = new Error('Pairing token tidak valid atau sudah kadaluarsa');
  error.statusCode = NOT_FOUND;
  return error;
}

async function buildFinalizedPairingResponse({ pairingSession, requestedSource }) {
  if (pairingSession.status === PAIRING_STATUSES.CONFIRMED) {
    const confirmedPatientId = pairingSession.confirmed_by_patient_id || null;
    let doctorPatientLink = null;

    if (confirmedPatientId) {
      doctorPatientLink = await doctorPatientRepository.findDoctorPatientLink({
        doctorId: pairingSession.doctor_id,
        patientId: confirmedPatientId,
      });

      if (!doctorPatientLink) {
        doctorPatientLink = await doctorPatientRepository.upsertDoctorPatientLink({
          doctorId: pairingSession.doctor_id,
          patientId: confirmedPatientId,
          source: requestedSource || DEFAULT_PAIRING_SOURCE,
        });
      }
    }

    return {
      pairingSessionId: pairingSession.pairing_session_id,
      doctorId: pairingSession.doctor_id,
      status: pairingSession.status,
      expiresAt: toIso(pairingSession.expires_at),
      confirmedAt: toIso(pairingSession.confirmed_at),
      patientId: confirmedPatientId,
      doctorPatientLink,
      httpStatus: OK,
    };
  }

  if (
    pairingSession.status === PAIRING_STATUSES.EXPIRED ||
    pairingSession.status === PAIRING_STATUSES.CANCELLED
  ) {
    return {
      pairingSessionId: pairingSession.pairing_session_id,
      doctorId: pairingSession.doctor_id,
      status: pairingSession.status,
      expiresAt: toIso(pairingSession.expires_at),
      confirmedAt: toIso(pairingSession.confirmed_at),
      patientId: pairingSession.confirmed_by_patient_id || null,
      doctorPatientLink: null,
      httpStatus: OK,
    };
  }

  const error = new Error('Session pairing dashboard belum mencapai status final');
  error.statusCode = 409;
  throw error;
}

async function createDashboardPairingSession({ actor, doctorId, expiresInSeconds = 90 }) {
  assertDoctorScope({ actor, doctorId });

  const pairingToken = generateDashboardPairingToken();
  const pairingTokenHash = hashPairingToken(pairingToken);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const pairingSession = await dashboardPairingRepository.createDashboardPairingSession({
    doctorId,
    pairingTokenHash,
    expiresAt,
  });

  return {
    pairingSessionId: pairingSession.pairing_session_id,
    doctorId: pairingSession.doctor_id,
    status: pairingSession.status,
    expiresAt: toIso(pairingSession.expires_at),
    pairingToken,
    qrPayload: pairingToken,
    pollingPath: `/api/v1/doctors/${doctorId}/dashboard/pairing-sessions/${pairingSession.pairing_session_id}`,
  };
}

async function getDashboardPairingSessionStatus({ actor, doctorId, pairingSessionId }) {
  assertDoctorScope({ actor, doctorId });

  let pairingSession = await dashboardPairingRepository.findDashboardPairingSessionById({
    doctorId,
    pairingSessionId,
  });

  if (!pairingSession) {
    const error = new Error('Session pairing dashboard tidak ditemukan');
    error.statusCode = NOT_FOUND;
    throw error;
  }

    if (
      pairingSession.status === PAIRING_STATUSES.PENDING &&
      new Date(pairingSession.expires_at).getTime() <= Date.now()
    ) {
    pairingSession =
      (await dashboardPairingRepository.markDashboardPairingSessionExpired(
        pairingSession.pairing_session_id
      )) || pairingSession;
  }

  return {
    pairingSessionId: pairingSession.pairing_session_id,
    doctorId: pairingSession.doctor_id,
    status: pairingSession.status,
    expiresAt: toIso(pairingSession.expires_at),
    confirmedAt: toIso(pairingSession.confirmed_at),
    patientId: pairingSession.confirmed_by_patient_id || null,
  };
}

async function confirmDashboardPairingSession({
  actor,
  pairingToken,
  source = DEFAULT_PAIRING_SOURCE,
}) {
  assertPatientActor(actor);

  const pairingTokenHash = hashPairingToken(pairingToken);
  let pairingSession =
    await dashboardPairingRepository.findDashboardPairingSessionByTokenHash(pairingTokenHash);

  if (!pairingSession) {
    throw buildPairingTokenNotFoundError();
  }

  if (
    pairingSession.status === PAIRING_STATUSES.PENDING &&
    new Date(pairingSession.expires_at).getTime() <= Date.now()
  ) {
    pairingSession =
      (await dashboardPairingRepository.markDashboardPairingSessionExpired(
        pairingSession.pairing_session_id
      )) || {
      ...pairingSession,
        status: PAIRING_STATUSES.EXPIRED,
    };

    return buildFinalizedPairingResponse({
      pairingSession,
      requestedSource: source,
    });
  }

  if (pairingSession.status !== PAIRING_STATUSES.PENDING) {
    return buildFinalizedPairingResponse({
      pairingSession,
      requestedSource: source,
    });
  }

  const patientId = actor.userId;
  const confirmation = await dashboardPairingRepository.confirmDashboardPairingSessionAtomic({
    pairingTokenHash,
    patientId,
    source,
  });

  if (confirmation) {
    return {
      pairingSessionId: confirmation.pairingSession.pairing_session_id,
      doctorId: confirmation.pairingSession.doctor_id,
      status: confirmation.pairingSession.status,
      expiresAt: toIso(confirmation.pairingSession.expires_at),
      confirmedAt: toIso(confirmation.pairingSession.confirmed_at),
      patientId: confirmation.pairingSession.confirmed_by_patient_id || patientId,
      doctorPatientLink: confirmation.doctorPatientLink,
      httpStatus: CREATED,
    };
  }

  pairingSession =
    await dashboardPairingRepository.findDashboardPairingSessionByTokenHash(pairingTokenHash);
  if (!pairingSession) {
    throw buildPairingTokenNotFoundError();
  }

  if (
    pairingSession.status === PAIRING_STATUSES.PENDING &&
    new Date(pairingSession.expires_at).getTime() <= Date.now()
  ) {
    pairingSession =
      (await dashboardPairingRepository.markDashboardPairingSessionExpired(
        pairingSession.pairing_session_id
      )) || {
        ...pairingSession,
        status: PAIRING_STATUSES.EXPIRED,
      };
  }

  return buildFinalizedPairingResponse({
    pairingSession,
    requestedSource: source,
  });
}

module.exports = {
  createDashboardPairingSession,
  getDashboardPairingSessionStatus,
  confirmDashboardPairingSession,
};
