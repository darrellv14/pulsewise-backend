const { NOT_FOUND } = require('../../constants/httpStatus');
const fcmTokenRepository = require('../../repositories/fcmTokenRepository');
const pushNotificationLogRepository = require('../../repositories/pushNotificationLogRepository');
const userRepository = require('../../repositories/userRepository');
const { createHttpError } = require('../../utils/httpError');
const { assertUserScope } = require('../shared/guards');
const { sendFcmMessage } = require('./fcmTransport');

async function assertUserExists(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw createHttpError('User tidak ditemukan', NOT_FOUND);
  }

  return user;
}

async function deliverNotificationToUser({
  actor,
  userId,
  title,
  body,
  data,
  notificationType,
  dedupeKey,
}) {
  if (actor) {
    assertUserScope({ actor, userId });
  }
  await assertUserExists(userId);
  const activeTokens = await fcmTokenRepository.listActiveUserFcmTokens(userId);
  if (!activeTokens.length) {
    throw createHttpError('FCM token aktif tidak ditemukan', NOT_FOUND);
  }

  const nowIso = new Date().toISOString();
  const finalData = {
    source: 'pulsewise-backend',
    sentAt: nowIso,
    ...data,
  };

  const results = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const tokenRow of activeTokens) {
    try {
      const providerResult = await sendFcmMessage({
        token: tokenRow.fcmToken,
        title,
        body,
        data: finalData,
      });

      await fcmTokenRepository.markFcmTokenSendSuccess(tokenRow.fcmTokenId);
      await pushNotificationLogRepository.createPushNotificationLog({
        userId,
        fcmTokenId: tokenRow.fcmTokenId,
        requestedByUserId: actor?.userId || null,
        dedupeKey: dedupeKey || null,
        notificationType,
        title,
        body,
        dataPayload: finalData,
        deliveryStatus: 'sent',
        providerMessageId: providerResult.providerMessageId,
        providerResponse: providerResult.providerResponse,
        sentAt: nowIso,
      });

      sentCount += 1;
      results.push({
        fcmTokenId: tokenRow.fcmTokenId,
        platform: tokenRow.platform,
        status: 'sent',
        messageId: providerResult.providerMessageId,
      });
    } catch (error) {
      failedCount += 1;
      const errorCode = error.providerErrorCode || 'UNKNOWN_FCM_ERROR';
      const deactivate = Boolean(error.isTerminalTokenError);

      await fcmTokenRepository.markFcmTokenSendFailure({
        fcmTokenId: tokenRow.fcmTokenId,
        errorCode,
        deactivate,
      });
      await pushNotificationLogRepository.createPushNotificationLog({
        userId,
        fcmTokenId: tokenRow.fcmTokenId,
        requestedByUserId: actor?.userId || null,
        dedupeKey: dedupeKey || null,
        notificationType,
        title,
        body,
        dataPayload: finalData,
        deliveryStatus: 'failed',
        providerErrorCode: errorCode,
        providerResponse: error.providerResponse || error.details?.providerResponse || null,
        failedAt: new Date().toISOString(),
      });

      results.push({
        fcmTokenId: tokenRow.fcmTokenId,
        platform: tokenRow.platform,
        status: 'failed',
        errorCode,
      });
    }
  }

  return {
    userId,
    notificationType,
    sentCount,
    failedCount,
    results,
  };
}

async function sendFcmTestNotification({ actor, userId, payload }) {
  return deliverNotificationToUser({
    actor,
    userId,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    notificationType: 'test_notification',
  });
}

module.exports = {
  deliverNotificationToUser,
  sendFcmTestNotification,
};
