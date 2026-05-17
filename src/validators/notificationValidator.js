const { z } = require('zod');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');

const optionalTrimmedString = (maxLength) =>
  z.union([z.string().trim().min(1).max(maxLength), z.literal('')]).optional();

const userIdParamSchema = z.object({
  userId: uuidV4Schema,
});

const fcmTokenPlatformSchema = z.enum(['android', 'ios', 'web']);

const registerFcmTokenSchema = z.object({
  fcmToken: z.string().trim().min(16).max(4096),
  platform: fcmTokenPlatformSchema,
  deviceId: optionalTrimmedString(255),
  deviceName: optionalTrimmedString(255),
  appVersion: optionalTrimmedString(64),
  appBuild: optionalTrimmedString(32),
  locale: optionalTrimmedString(16),
  timezone: optionalTrimmedString(64),
});

const revokeFcmTokenSchema = z
  .object({
    fcmToken: z.string().trim().min(16).max(4096).optional(),
    deviceId: z.string().trim().min(1).max(255).optional(),
  })
  .refine((value) => value.fcmToken || value.deviceId, {
    message: 'fcmToken atau deviceId wajib diisi',
    path: ['fcmToken'],
  });

const testNotificationDataSchema = z.record(
  z.string().trim().min(1),
  z.union([z.string(), z.number(), z.boolean()])
);

const sendFcmTestSchema = z.object({
  title: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(2000),
  data: testNotificationDataSchema.optional().default({}),
});

module.exports = {
  userIdParamSchema,
  registerFcmTokenSchema,
  revokeFcmTokenSchema,
  sendFcmTestSchema,
};
