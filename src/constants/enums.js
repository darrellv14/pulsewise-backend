const { METRIC_REGISTRY } = require('../utils/metricTypes');

const METRIC_TYPES = Object.freeze(Object.keys(METRIC_REGISTRY));

const ACCOUNT_STATUSES = Object.freeze({
  PENDING_VERIFICATION: 'pending_verification',
  PENDING_ADMIN_VERIFICATION: 'pending_admin_verification',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});

const EMAIL_VERIFICATION_PURPOSES = Object.freeze({
  EMAIL_VERIFICATION: 'email_verification',
  FORGOT_PASSWORD: 'forgot_password',
  ACCOUNT_DELETION: 'account_deletion',
});

const PAIRING_STATUSES = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

const PAIRING_TERMINAL_STATUSES = new Set([
  PAIRING_STATUSES.CONFIRMED,
  PAIRING_STATUSES.EXPIRED,
  PAIRING_STATUSES.CANCELLED,
]);

const BIOMETRIC_SOURCES = Object.freeze({
  HEALTH_CONNECT: 'health_connect',
  MANUAL: 'manual',
  SMARTWATCH: 'smartwatch',
});

const CONDITION_TAGS = Object.freeze({
  AFTER_BREAKFAST: 'after_breakfast',
  HEART: 'heart',
  OTHER: 'other',
});

const KNOWN_BIOMETRIC_SOURCES = new Set(Object.values(BIOMETRIC_SOURCES));
const KNOWN_CONDITION_TAGS = new Set(Object.values(CONDITION_TAGS));

function normalizeBiometricSource(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
}

function isKnownBiometricSource(value) {
  const normalized = normalizeBiometricSource(value);
  return normalized ? KNOWN_BIOMETRIC_SOURCES.has(normalized) : false;
}

function normalizeConditionTag(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const canonical = normalized.toLowerCase();
  return KNOWN_CONDITION_TAGS.has(canonical) ? canonical : normalized;
}

function isKnownConditionTag(value) {
  const normalized = normalizeConditionTag(value);
  return normalized ? KNOWN_CONDITION_TAGS.has(String(normalized).toLowerCase()) : false;
}

module.exports = {
  METRIC_TYPES,
  METRIC_REGISTRY,
  ACCOUNT_STATUSES,
  EMAIL_VERIFICATION_PURPOSES,
  PAIRING_STATUSES,
  PAIRING_TERMINAL_STATUSES,
  BIOMETRIC_SOURCES,
  CONDITION_TAGS,
  normalizeBiometricSource,
  isKnownBiometricSource,
  normalizeConditionTag,
  isKnownConditionTag,
};
