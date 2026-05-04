function createHttpError(message, statusCode, details = null, options = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details !== null) {
    error.details = details;
  }

  if (options.exposeDetails !== undefined) {
    error.exposeDetails = options.exposeDetails;
  }

  return error;
}

module.exports = {
  createHttpError,
};
