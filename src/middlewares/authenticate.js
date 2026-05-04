const jwt = require('jsonwebtoken');
const { UNAUTHORIZED } = require('../constants/httpStatus');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const { fail } = require('../utils/response');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return fail(res, 'Token tidak ditemukan', UNAUTHORIZED);
    }

    const decoded = jwt.verify(token, env.jwtSecret);

    if (env.auth.recheckUserOnProtectedRoutes) {
      const user = await userRepository.findUserById(decoded.userId);

      if (!user || user.account_status !== 'active') {
        return fail(res, 'Token tidak valid', UNAUTHORIZED);
      }
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return fail(res, 'Token tidak valid', UNAUTHORIZED);
  }
}

module.exports = authenticate;
