const jwt = require('jsonwebtoken');
const { UNAUTHORIZED } = require('../constants/httpStatus');
const env = require('../config/env');
const { fail } = require('../utils/response');

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return fail(res, 'Token tidak ditemukan', UNAUTHORIZED);
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    return next();
  } catch (error) {
    return fail(res, 'Token tidak valid', UNAUTHORIZED);
  }
}

module.exports = authenticate;
