const { INTERNAL_SERVER_ERROR } = require('../constants/httpStatus');
const { fail } = require('../utils/response');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || INTERNAL_SERVER_ERROR;
  const message = err.message || 'Terjadi kesalahan pada server';
  const shouldExposeDetails =
    process.env.NODE_ENV !== 'production' || err.exposeDetails === true;

  if (process.env.NODE_ENV !== 'test') {
    console.error('[errorHandler]', err);
  }

  return fail(res, message, statusCode, shouldExposeDetails ? err.details || null : null);
}

module.exports = errorHandler;
