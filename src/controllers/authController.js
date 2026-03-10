const authService = require('../services/authService');
const { success } = require('../utils/response');
const { BAD_REQUEST, CREATED } = require('../constants/httpStatus');

async function register(req, res, next) {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role,
    } = req.body;

    if (!username || !email || !password) {
      return res.status(BAD_REQUEST).json({
        success: false,
        message: 'Username, email, dan password wajib diisi',
      });
    }

    const result = await authService.register({
      username,
      email,
      password,
      firstName,
      lastName,
      role,
    });

    return success(res, 'Register berhasil', result, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi',
      });
    }

    const result = await authService.login(email, password);
    return success(res, 'Login berhasil', result);
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    return success(res, 'Data user berhasil diambil', user);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  me,
};
