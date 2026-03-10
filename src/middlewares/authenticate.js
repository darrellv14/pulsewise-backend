const jwt = require('jsonwebtoken');
const { UNAUTHORIZED } = require('../constants/httpStatus');
const env = require('../config/env');

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(UNAUTHORIZED).json({
        success: false,
        message: 'Token tidak ditemukan',
      });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(UNAUTHORIZED).json({
      success: false,
      message: 'Token tidak valid',
    });
  }
}

module.exports = authenticate;
