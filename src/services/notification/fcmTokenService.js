const { NOT_FOUND } = require('../../constants/httpStatus');
const fcmTokenRepository = require('../../repositories/fcmTokenRepository');
const userRepository = require('../../repositories/userRepository');
const { createHttpError } = require('../../utils/httpError');
const { assertUserScope } = require('../shared/guards');

async function assertUserExists(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw createHttpError('User tidak ditemukan', NOT_FOUND);
  }

  return user;
}

async function registerFcmToken({ actor, userId, payload }) {
  assertUserScope({ actor, userId });
  await assertUserExists(userId);

  return fcmTokenRepository.upsertUserFcmToken({
    userId,
    fcmToken: payload.fcmToken,
    platform: payload.platform,
    deviceId: payload.deviceId,
    deviceName: payload.deviceName,
    appVersion: payload.appVersion,
    appBuild: payload.appBuild,
    locale: payload.locale,
    timezone: payload.timezone,
  });
}

async function listFcmTokens({ actor, userId }) {
  assertUserScope({ actor, userId });
  await assertUserExists(userId);

  return {
    items: await fcmTokenRepository.listUserFcmTokens(userId),
  };
}

async function revokeFcmToken({ actor, userId, payload }) {
  assertUserScope({ actor, userId });
  await assertUserExists(userId);

  return fcmTokenRepository.revokeUserFcmTokens({
    userId,
    fcmToken: payload.fcmToken,
    deviceId: payload.deviceId,
  });
}

module.exports = {
  registerFcmToken,
  listFcmTokens,
  revokeFcmToken,
};
