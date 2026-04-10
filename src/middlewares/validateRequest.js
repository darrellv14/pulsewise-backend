const { BAD_REQUEST } = require('../constants/httpStatus');
const { fail } = require('../utils/response');
const { ZodError } = require('zod');

function toErrorDetails(error) {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));
  }

  return [
    {
      field: '',
      issue: 'Validasi request gagal',
    },
  ];
}

function validateRequest(schema, key = 'body') {
  return function validationMiddleware(req, res, next) {
    if (!schema || typeof schema.safeParse !== 'function') {
      return fail(res, 'Schema validasi tidak valid. Gunakan schema Zod.', BAD_REQUEST, {
        code: 'INVALID_VALIDATION_SCHEMA',
        details: [
          {
            field: key,
            issue: 'Schema harus berupa Zod schema dengan method safeParse',
          },
        ],
      });
    }

    const result = schema.safeParse(req[key]);

    if (!result.success) {
      return fail(res, 'Validasi request gagal', BAD_REQUEST, {
        code: 'VALIDATION_ERROR',
        details: toErrorDetails(result.error),
      });
    }

    req[key] = result.data;
    return next();
  };
}

module.exports = validateRequest;
