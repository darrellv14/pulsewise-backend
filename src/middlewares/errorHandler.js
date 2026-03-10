const { INTERNAL_SERVER_ERROR } = require('../constants/httpStatus');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || INTERNAL_SERVER_ERROR;
  const message = err.message || 'Terjadi kesalahan pada server';

  if (process.env.NODE_ENV !== 'test') {
    console.error('[errorHandler]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
