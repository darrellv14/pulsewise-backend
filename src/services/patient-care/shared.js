const { FORBIDDEN } = require('../../constants/httpStatus');
const { createHttpError } = require('../../utils/httpError');

function assertUserScope({ actor, userId }) {
  if (!actor) {
    throw createHttpError('Aktor tidak valid', FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.userId !== userId) {
    throw createHttpError('Akses user scope ditolak', FORBIDDEN);
  }
}

function toIso(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toDateOnly(value) {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function toTimeOnly(value) {
  const iso = toIso(value);
  return iso ? iso.slice(11, 16) : null;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeNullableText(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function combineDateAndTime(diaryDate, time) {
  const [year, month, day] = diaryDate.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0)).toISOString();
}

function resolveDiaryEntryTimestamp({ diaryDate, time, timeStamp }) {
  if (timeStamp) {
    return timeStamp;
  }

  if (time) {
    return combineDateAndTime(diaryDate, time);
  }

  return null;
}

module.exports = {
  assertUserScope,
  toIso,
  toDateOnly,
  toTimeOnly,
  hasOwn,
  normalizeNullableText,
  combineDateAndTime,
  resolveDiaryEntryTimestamp,
};
