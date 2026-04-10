const { CREATED } = require('../constants/httpStatus');
const { success } = require('../utils/response');
const biometricService = require('../services/biometricService');

async function ingestBiometrics(req, res, next) {
  try {
    const data = await biometricService.ingestBiometrics({
      actor: req.user,
      payload: req.body,
    });

    return success(res, 'Ingest biometrik berhasil diproses', data, CREATED);
  } catch (error) {
    return next(error);
  }
}

async function listBiometrics(req, res, next) {
  try {
    const data = await biometricService.listBiometrics({
      actor: req.user,
      query: req.query,
    });

    return success(res, 'Histori biometrik berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  ingestBiometrics,
  listBiometrics,
};
