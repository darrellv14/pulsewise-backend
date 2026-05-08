const crypto = require('crypto');

const CACHE_PREFIX = 'pulsewise';

function hashPayload(value) {
  return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex');
}

function dashboardPatientsListKey({ doctorId, query }) {
  return `${CACHE_PREFIX}:dashboard:list:doctor:${doctorId}:${hashPayload(query || {})}`;
}

function dashboardPatientsListPrefix() {
  return `${CACHE_PREFIX}:dashboard:list:doctor:`;
}

function dashboardPatientSummaryKey({ doctorId, patientId }) {
  return `${CACHE_PREFIX}:dashboard:summary:patient:${patientId}:doctor:${doctorId}`;
}

function patientSelfDashboardSummaryKey({ userId }) {
  return `${CACHE_PREFIX}:dashboard:summary:patient:${userId}:self`;
}

function dashboardPatientSummaryPrefix(patientId) {
  return `${CACHE_PREFIX}:dashboard:summary:patient:${patientId}:`;
}

function dashboardPatientVitalsKey({ doctorId, patientId, query }) {
  return `${CACHE_PREFIX}:dashboard:vitals:patient:${patientId}:doctor:${doctorId}:${hashPayload(query || {})}`;
}

function patientSelfDashboardVitalsKey({ userId, query }) {
  return `${CACHE_PREFIX}:dashboard:vitals:patient:${userId}:self:${hashPayload(query || {})}`;
}

function dashboardPatientVitalsPrefix(patientId) {
  return `${CACHE_PREFIX}:dashboard:vitals:patient:${patientId}:`;
}

function dashboardPatientAbnormalReportKey({ doctorId, patientId, query }) {
  return `${CACHE_PREFIX}:dashboard:abnormal-report:patient:${patientId}:doctor:${doctorId}:${hashPayload(query || {})}`;
}

function patientSelfDashboardAbnormalReportKey({ userId, query }) {
  return `${CACHE_PREFIX}:dashboard:abnormal-report:patient:${userId}:self:${hashPayload(query || {})}`;
}

function dashboardPatientAbnormalReportPrefix(patientId) {
  return `${CACHE_PREFIX}:dashboard:abnormal-report:patient:${patientId}:`;
}

function diaryByDateKey({ userId, diaryDate }) {
  return `${CACHE_PREFIX}:diary:by-date:user:${userId}:date:${diaryDate}`;
}

function diaryByDatePrefix(userId) {
  return `${CACHE_PREFIX}:diary:by-date:user:${userId}:`;
}

function sleepByDateKey({ userId, diaryDate }) {
  return `${CACHE_PREFIX}:sleep:by-date:user:${userId}:date:${diaryDate}`;
}

function sleepByDatePrefix(userId) {
  return `${CACHE_PREFIX}:sleep:by-date:user:${userId}:`;
}

module.exports = {
  dashboardPatientsListKey,
  dashboardPatientsListPrefix,
  dashboardPatientSummaryKey,
  patientSelfDashboardSummaryKey,
  dashboardPatientSummaryPrefix,
  dashboardPatientVitalsKey,
  patientSelfDashboardVitalsKey,
  dashboardPatientVitalsPrefix,
  dashboardPatientAbnormalReportKey,
  patientSelfDashboardAbnormalReportKey,
  dashboardPatientAbnormalReportPrefix,
  diaryByDateKey,
  diaryByDatePrefix,
  sleepByDateKey,
  sleepByDatePrefix,
};
