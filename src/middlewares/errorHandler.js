const { INTERNAL_SERVER_ERROR } = require('../constants/httpStatus');
const { fail } = require('../utils/response');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || INTERNAL_SERVER_ERROR;
  const message = err.message || 'Terjadi kesalahan pada server';

  if (process.env.NODE_ENV !== 'test') {
    console.error('[errorHandler]', err);
  }

  return fail(res, message, statusCode, err.details || null);
}

module.exports = errorHandler;
