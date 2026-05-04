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

function dashboardPatientSummaryPrefix(patientId) {
  return `${CACHE_PREFIX}:dashboard:summary:patient:${patientId}:`;
}

function diaryByDateKey({ userId, diaryDate }) {
  return `${CACHE_PREFIX}:diary:by-date:user:${userId}:date:${diaryDate}`;
}

function diaryByDatePrefix(userId) {
  return `${CACHE_PREFIX}:diary:by-date:user:${userId}:`;
}

module.exports = {
  dashboardPatientsListKey,
  dashboardPatientsListPrefix,
  dashboardPatientSummaryKey,
  dashboardPatientSummaryPrefix,
  diaryByDateKey,
  diaryByDatePrefix,
};
