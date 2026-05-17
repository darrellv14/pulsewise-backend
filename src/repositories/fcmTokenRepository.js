const prisma = require('../config/prisma');

function mapFcmDeviceToken(row, options = {}) {
  if (!row) {
    return null;
  }

  const mapped = {
    fcmTokenId: row.fcmTokenId,
    userId: row.userId,
    platform: row.platform,
    deviceId: row.deviceId || null,
    deviceName: row.deviceName || null,
    appVersion: row.appVersion || null,
    appBuild: row.appBuild || null,
    locale: row.locale || null,
    timezone: row.timezone || null,
    isActive: row.isActive,
    lastSeenAt: row.lastSeenAt,
    revokedAt: row.revokedAt,
    failureCount: row.failureCount,
    lastFailureCode: row.lastFailureCode || null,
    lastSentAt: row.lastSentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (options.includeToken) {
    mapped.fcmToken = row.fcmToken;
  }

  return mapped;
}

async function listUserFcmTokens(userId) {
  const rows = await prisma.fcmDeviceToken.findMany({
    where: {
      userId,
    },
    orderBy: [{ isActive: 'desc' }, { lastSeenAt: 'desc' }, { createdAt: 'desc' }],
  });

  return rows.map((row) => mapFcmDeviceToken(row));
}

async function listActiveUserFcmTokens(userId) {
  const rows = await prisma.fcmDeviceToken.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
  });

  return rows.map((row) => mapFcmDeviceToken(row, { includeToken: true }));
}

async function upsertUserFcmToken({
  userId,
  fcmToken,
  platform,
  deviceId,
  deviceName,
  appVersion,
  appBuild,
  locale,
  timezone,
}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    if (deviceId) {
      await tx.fcmDeviceToken.updateMany({
        where: {
          userId,
          deviceId,
          platform,
          isActive: true,
          NOT: {
            fcmToken,
          },
        },
        data: {
          isActive: false,
          revokedAt: now,
          updatedAt: now,
        },
      });
    }

    const existing = await tx.fcmDeviceToken.findUnique({
      where: {
        fcmToken,
      },
    });

    if (existing) {
      const updated = await tx.fcmDeviceToken.update({
        where: {
          fcmToken,
        },
        data: {
          userId,
          platform,
          deviceId: deviceId || null,
          deviceName: deviceName || null,
          appVersion: appVersion || null,
          appBuild: appBuild || null,
          locale: locale || null,
          timezone: timezone || null,
          isActive: true,
          revokedAt: null,
          lastSeenAt: now,
          updatedAt: now,
        },
      });

      return {
        token: mapFcmDeviceToken(updated),
        wasCreated: false,
      };
    }

    const created = await tx.fcmDeviceToken.create({
      data: {
        userId,
        fcmToken,
        platform,
        deviceId: deviceId || null,
        deviceName: deviceName || null,
        appVersion: appVersion || null,
        appBuild: appBuild || null,
        locale: locale || null,
        timezone: timezone || null,
        isActive: true,
        lastSeenAt: now,
        updatedAt: now,
      },
    });

    return {
      token: mapFcmDeviceToken(created),
      wasCreated: true,
    };
  });
}

async function revokeUserFcmTokens({ userId, fcmToken, deviceId }) {
  const now = new Date();
  const where = {
    userId,
    isActive: true,
  };

  if (fcmToken) {
    where.fcmToken = fcmToken;
  }

  if (deviceId) {
    where.deviceId = deviceId;
  }

  const rows = await prisma.fcmDeviceToken.findMany({
    where,
  });

  if (!rows.length) {
    return {
      revokedCount: 0,
      items: [],
    };
  }

  const targetIds = rows.map((row) => row.fcmTokenId);

  await prisma.fcmDeviceToken.updateMany({
    where: {
      fcmTokenId: {
        in: targetIds,
      },
    },
    data: {
      isActive: false,
      revokedAt: now,
      updatedAt: now,
    },
  });

  return {
    revokedCount: rows.length,
    items: rows.map((row) =>
      mapFcmDeviceToken({
        ...row,
        isActive: false,
        revokedAt: now,
        updatedAt: now,
      })
    ),
  };
}

async function markFcmTokenSendSuccess(fcmTokenId) {
  const now = new Date();
  const updated = await prisma.fcmDeviceToken.update({
    where: {
      fcmTokenId,
    },
    data: {
      lastSentAt: now,
      failureCount: 0,
      lastFailureCode: null,
      updatedAt: now,
    },
  });

  return mapFcmDeviceToken(updated);
}

async function markFcmTokenSendFailure({ fcmTokenId, errorCode, deactivate = false }) {
  const now = new Date();
  const updated = await prisma.fcmDeviceToken.update({
    where: {
      fcmTokenId,
    },
    data: {
      failureCount: {
        increment: 1,
      },
      lastFailureCode: errorCode || null,
      isActive: deactivate ? false : undefined,
      revokedAt: deactivate ? now : undefined,
      updatedAt: now,
    },
  });

  return mapFcmDeviceToken(updated);
}

module.exports = {
  listUserFcmTokens,
  listActiveUserFcmTokens,
  upsertUserFcmToken,
  revokeUserFcmTokens,
  markFcmTokenSendSuccess,
  markFcmTokenSendFailure,
};
