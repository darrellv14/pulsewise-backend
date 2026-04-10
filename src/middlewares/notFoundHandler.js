const { fail } = require('../utils/response');

function notFoundHandler(req, res) {
  return fail(res, 'Route tidak ditemukan', 404);
}

module.exports = notFoundHandler;
