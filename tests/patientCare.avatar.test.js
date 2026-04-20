const crypto = require('crypto');

jest.mock('../src/config/env', () => ({
  cloudinary: {
    url: '',
    apiKey: 'key123',
    apiSecret: 'secret123',
    cloudName: 'demo-cloud',
    uploadFolder: 'pulsewise/avatar',
    avatarMaxBytes: 200000,
    avatarMaxWidth: 256,
    avatarMaxHeight: 256,
    avatarAllowedFormats: 'jpg,jpeg,png,webp',
    avatarQuality: 'auto:good',
  },
}));

jest.mock('../src/repositories/patientCareRepository', () => ({
  updateUserAvatar: jest.fn(),
}));

const patientCareRepository = require('../src/repositories/patientCareRepository');
const patientCareService = require('../src/services/patientCareService');
const { avatarSaveSchema } = require('../src/validators/patientCareValidator');

describe('patient care avatar upload flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('createAvatarUploadSignature returns constrained Cloudinary params', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-11T00:00:00.000Z').getTime());

    const envConfig = {
      cloudinary: {
        url: '',
        apiKey: 'key123',
        apiSecret: 'secret123',
        cloudName: 'demo-cloud',
        uploadFolder: 'pulsewise/avatar',
        avatarMaxBytes: 200000,
        avatarMaxWidth: 256,
        avatarMaxHeight: 256,
        avatarAllowedFormats: 'jpg,jpeg,png,webp',
        avatarQuality: 'auto:good',
      },
    };

    const result = await patientCareService.createAvatarUploadSignature({
      actor: { userId: 'user-1', role: 'patient' },
      userId: 'user-1',
      query: {},
      envConfig,
    });

    const expectedTimestamp = Math.floor(new Date('2026-04-11T00:00:00.000Z').getTime() / 1000);
    const expectedSignature = crypto
      .createHash('sha1')
      .update(
        `allowed_formats=jpg,jpeg,png,webp&folder=pulsewise/avatar&timestamp=${expectedTimestamp}&transformation=c_limit,h_256,w_256,q_auto:goodsecret123`
      )
      .digest('hex');

    expect(result).toMatchObject({
      cloudName: 'demo-cloud',
      apiKey: 'key123',
      timestamp: expectedTimestamp,
      folder: 'pulsewise/avatar',
      transformation: 'c_limit,h_256,w_256,q_auto:good',
      allowed_formats: 'jpg,jpeg,png,webp',
      signature: expectedSignature,
      uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
    });
  });

  test('avatarSaveSchema accepts upload metadata within limits', () => {
    const result = avatarSaveSchema.parse({
      secureUrl:
        'https://res.cloudinary.com/demo-cloud/image/upload/v1/pulsewise/avatar/avatar.webp',
      publicId: 'pulsewise/avatar/avatar',
      bytes: 120000,
      width: 256,
      height: 256,
      format: 'webp',
      resourceType: 'image',
    });

    expect(result.bytes).toBe(120000);
    expect(result.width).toBe(256);
    expect(result.format).toBe('webp');
  });

  test('saveAvatarUploadResult rejects oversized avatar metadata', async () => {
    await expect(
      patientCareService.saveAvatarUploadResult({
        actor: { userId: 'user-1', role: 'patient' },
        userId: 'user-1',
        payload: {
          secureUrl:
            'https://res.cloudinary.com/demo-cloud/image/upload/v1/pulsewise/avatar/avatar.webp',
          publicId: 'pulsewise/avatar/avatar',
          bytes: 250000,
          width: 256,
          height: 256,
          format: 'webp',
          resourceType: 'image',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Ukuran avatar melebihi batas 200000 bytes',
    });

    expect(patientCareRepository.updateUserAvatar).not.toHaveBeenCalled();
  });
});
