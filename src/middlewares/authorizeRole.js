const { FORBIDDEN } = require('../constants/httpStatus');
const { fail } = require('../utils/response');

function authorizeRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return fail(res, 'Anda tidak memiliki akses ke resource ini', FORBIDDEN);
    }

    return next();
  };
}

module.exports = authorizeRole;
