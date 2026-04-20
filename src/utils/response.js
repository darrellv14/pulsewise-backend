function sanitizeJsonValue(value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.toJSON === 'function' && Object.getPrototypeOf(value) !== Object.prototype) {
    return sanitizeJsonValue(value.toJSON());
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, sanitizeJsonValue(nestedValue)])
  );
}

function json(res, statusCode, payload) {
  return res.status(statusCode).json(sanitizeJsonValue(payload));
}

function success(res, message, data = null, statusCode = 200) {
  return json(res, statusCode, {
    success: true,
    message,
    data,
  });
}

function fail(res, message, statusCode = 400, details = null) {
  return json(res, statusCode, {
    success: false,
    message,
    details,
  });
}

module.exports = {
  success,
  fail,
};
