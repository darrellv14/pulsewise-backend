const jwt = require('jsonwebtoken');
const { UNAUTHORIZED } = require('../constants/httpStatus');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const { ACCOUNT_STATUSES } = require('../constants/enums');
const { fail } = require('../utils/response');

function canAuthenticateProtectedRoute(user, decoded) {
  if (!user) {
    return false;
  }

  if (user.account_status === ACCOUNT_STATUSES.ACTIVE) {
    return true;
  }

  return (
    decoded.role === 'doctor' &&
    user.role === 'doctor' &&
    user.account_status === ACCOUNT_STATUSES.PENDING_ADMIN_VERIFICATION
  );
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return fail(res, 'Token tidak ditemukan', UNAUTHORIZED);
    }

    const decoded = jwt.verify(token, env.jwtSecret);

    const shouldRecheckUser =
      env.auth.recheckUserOnProtectedRoutes &&
      process.env.NODE_ENV !== 'test' &&
      process.env.AUTH_RECHECK_USER !== 'false';

    if (shouldRecheckUser) {
      const user = await userRepository.findUserById(decoded.userId);

      if (!canAuthenticateProtectedRoute(user, decoded)) {
        return fail(res, 'Token tidak valid', UNAUTHORIZED);
      }

      req.user = {
        ...decoded,
        role: user.role || decoded.role,
        roles: user.roles || decoded.roles || [user.role || decoded.role],
        accountStatus: user.account_status,
        doctorVerification: user.doctor_verification || null,
      };

      return next();
    }

    req.user = {
      ...decoded,
      roles: decoded.roles || (decoded.role ? [decoded.role] : []),
      accountStatus:
        decoded.accountStatus ||
        (decoded.role === 'doctor' || decoded.role === 'admin'
          ? ACCOUNT_STATUSES.ACTIVE
          : undefined),
      doctorVerification: decoded.doctorVerification || null,
    };
    return next();
  } catch (error) {
    return fail(res, 'Token tidak valid', UNAUTHORIZED);
  }
}

module.exports = authenticate;
