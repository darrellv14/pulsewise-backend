const env = require('../config/env');

function readBearerToken(authorizationHeader) {
  const raw = String(authorizationHeader || '');
  if (!raw.startsWith('Bearer ')) {
    return '';
  }

  return raw.slice('Bearer '.length).trim();
}

function metricsAuth(req, res, next) {
  if (!env.metrics.enabled) {
    return res.status(404).json({
      success: false,
      message: 'Route tidak ditemukan',
      details: null,
    });
  }

  const providedToken =
    req.headers['x-metrics-token'] || readBearerToken(req.headers.authorization);

  if (!env.metrics.token || providedToken !== env.metrics.token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      details: null,
    });
  }

  return next();
}

module.exports = metricsAuth;
