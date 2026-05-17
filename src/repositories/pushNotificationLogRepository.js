const prisma = require('../config/prisma');

function mapPushNotificationLog(row) {
  if (!row) {
    return null;
  }

  return {
    notificationLogId: row.notificationLogId,
    userId: row.userId,
    fcmTokenId: row.fcmTokenId || null,
    requestedByUserId: row.requestedByUserId || null,
    dedupeKey: row.dedupeKey || null,
    notificationType: row.notificationType,
    title: row.title,
    body: row.body,
    dataPayload: row.dataPayload || null,
    deliveryStatus: row.deliveryStatus,
    providerMessageId: row.providerMessageId || null,
    providerErrorCode: row.providerErrorCode || null,
    providerResponse: row.providerResponse || null,
    sentAt: row.sentAt,
    deliveredAt: row.deliveredAt,
    failedAt: row.failedAt,
    createdAt: row.createdAt,
  };
}

async function createPushNotificationLog({
  userId,
  fcmTokenId,
  requestedByUserId,
  dedupeKey,
  notificationType,
  title,
  body,
  dataPayload,
  deliveryStatus,
  providerMessageId,
  providerErrorCode,
  providerResponse,
  sentAt,
  deliveredAt,
  failedAt,
}) {
  const row = await prisma.pushNotificationLog.create({
    data: {
      userId,
      fcmTokenId: fcmTokenId || null,
      requestedByUserId: requestedByUserId || null,
      dedupeKey: dedupeKey || null,
      notificationType,
      title,
      body,
      dataPayload: dataPayload || null,
      deliveryStatus,
      providerMessageId: providerMessageId || null,
      providerErrorCode: providerErrorCode || null,
      providerResponse: providerResponse || null,
      sentAt: sentAt ? new Date(sentAt) : null,
      deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
      failedAt: failedAt ? new Date(failedAt) : null,
    },
  });

  return mapPushNotificationLog(row);
}

async function findPushNotificationLogByDedupeKey(dedupeKey) {
  if (!dedupeKey) {
    return null;
  }

  const row = await prisma.pushNotificationLog.findFirst({
    where: {
      dedupeKey,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return mapPushNotificationLog(row);
}

module.exports = {
  createPushNotificationLog,
  findPushNotificationLogByDedupeKey,
};
