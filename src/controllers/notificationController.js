const { success } = require('../utils/response');
const notificationService = require('../services/notificationService');

async function registerFcmToken(req, res, next) {
  try {
    const data = await notificationService.registerFcmToken({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'FCM token berhasil disimpan', data);
  } catch (error) {
    return next(error);
  }
}

async function listFcmTokens(req, res, next) {
  try {
    const data = await notificationService.listFcmTokens({
      actor: req.user,
      userId: req.params.userId,
    });

    return success(res, 'Daftar FCM token berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function revokeFcmToken(req, res, next) {
  try {
    const data = await notificationService.revokeFcmToken({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'FCM token berhasil dinonaktifkan', data);
  } catch (error) {
    return next(error);
  }
}

async function sendFcmTestNotification(req, res, next) {
  try {
    const data = await notificationService.sendFcmTestNotification({
      actor: req.user,
      userId: req.params.userId,
      payload: req.body,
    });

    return success(res, 'Test notification berhasil dikirim', data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerFcmToken,
  listFcmTokens,
  revokeFcmToken,
  sendFcmTestNotification,
};
