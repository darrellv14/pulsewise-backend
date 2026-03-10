const { FORBIDDEN } = require('../constants/httpStatus');

function authorizeRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(FORBIDDEN).json({
        success: false,
        message: 'Anda tidak memiliki akses ke resource ini',
      });
    }

    return next();
  };
}

module.exports = authorizeRole;
