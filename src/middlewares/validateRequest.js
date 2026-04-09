const { BAD_REQUEST } = require('../constants/httpStatus');

function validateRequest(schema, key = 'body') {
  return function validationMiddleware(req, res, next) {
    const { error, value } = schema.validate(req[key], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(BAD_REQUEST).json({
        success: false,
        message: 'Validasi request gagal',
        error: {
          code: 'VALIDATION_ERROR',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            issue: detail.message,
          })),
        },
      });
    }

    req[key] = value;
    return next();
  };
}

module.exports = validateRequest;
