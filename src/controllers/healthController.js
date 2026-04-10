const { healthCheck } = require('../config/database');
const { success } = require('../utils/response');

function healthz(req, res) {
  return success(res, 'Pulse Wise Backend is live', {
    timestamp: new Date().toISOString(),
  });
}

async function health(req, res, next) {
  try {
    const db = await healthCheck();
    return success(res, 'Pulse Wise Backend is running smoothly', {
      timestamp: new Date().toISOString(),
      dbTime: db.db_time,
    });
  } catch (error) {
    error.statusCode = 500;
    return next(error);
  }
}

module.exports = {
  healthz,
  health,
};
