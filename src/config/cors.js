const env = require('./env');

function normalizeOriginList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

function buildCorsOptions() {
  const allowedOrigins = env.cors.allowedOrigins;
  const isOpen = env.cors.allowAllOrigins;

  return {
    origin(origin, callback) {
      if (isOpen || isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }

      const error = new Error('Origin tidak diizinkan oleh kebijakan CORS');
      error.statusCode = 403;
      return callback(error);
    },
    credentials: env.cors.credentials,
  };
}

module.exports = {
  buildCorsOptions,
  normalizeOriginList,
};
