const crypto = require('crypto');
const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND } = require('../../constants/httpStatus');
const env = require('../../config/env');
const patientCareRepository = require('../../repositories/patientCareRepository');
const { createHttpError } = require('../../utils/httpError');
const { assertUserScope, toIso } = require('./shared');

function parseCloudinaryUrl(cloudinaryUrl) {
  if (!cloudinaryUrl) {
    return null;
  }

  try {
    const parsed = new URL(cloudinaryUrl);
    return {
      apiKey: parsed.username ? decodeURIComponent(parsed.username) : null,
      apiSecret: parsed.password ? decodeURIComponent(parsed.password) : null,
      cloudName: parsed.hostname || null,
    };
  } catch (_error) {
    return null;
  }
}

function resolveCloudinaryConfig(envConfig) {
  const fromUrl = parseCloudinaryUrl(envConfig.cloudinary.url);

  const apiKey = envConfig.cloudinary.apiKey || fromUrl?.apiKey || null;
  const apiSecret = envConfig.cloudinary.apiSecret || fromUrl?.apiSecret || null;
  const cloudName = envConfig.cloudinary.cloudName || fromUrl?.cloudName || null;

  if (!apiKey || !apiSecret || !cloudName) {
    throw createHttpError(
      'Konfigurasi Cloudinary belum lengkap. Isi CLOUDINARY_URL atau CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET/CLOUDINARY_CLOUD_NAME.',
      INTERNAL_SERVER_ERROR
    );
  }

  return {
    apiKey,
    apiSecret,
    cloudName,
  };
}

function signCloudinaryParams(params, apiSecret) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto.createHash('sha1').update(`${sorted}${apiSecret}`).digest('hex');
}

function buildAvatarUploadPolicy(envConfig) {
  const maxBytes = Math.max(1, Number(envConfig.cloudinary.avatarMaxBytes) || 2 * 1024 * 1024);
  const maxWidth = Math.max(1, Number(envConfig.cloudinary.avatarMaxWidth) || 512);
  const maxHeight = Math.max(1, Number(envConfig.cloudinary.avatarMaxHeight) || 512);
  const quality = String(envConfig.cloudinary.avatarQuality || 'auto:good').trim() || 'auto:good';
  const allowedFormats = String(envConfig.cloudinary.avatarAllowedFormats || 'jpg,jpeg,png,webp')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return {
    maxBytes,
    maxWidth,
    maxHeight,
    quality,
    allowedFormats,
    allowedFormatsCsv: allowedFormats.join(','),
    transformation: `c_limit,h_${maxHeight},w_${maxWidth},q_${quality}`,
  };
}

function assertAvatarUploadResult(payload, envConfig, cloudinaryConfig) {
  const policy = buildAvatarUploadPolicy(envConfig);

  if (payload.resourceType && String(payload.resourceType).trim().toLowerCase() !== 'image') {
    throw createHttpError('Avatar harus berupa image', BAD_REQUEST);
  }

  if (payload.bytes && Number(payload.bytes) > policy.maxBytes) {
    throw createHttpError(`Ukuran avatar melebihi batas ${policy.maxBytes} bytes`, BAD_REQUEST);
  }

  if (payload.width && Number(payload.width) > policy.maxWidth) {
    throw createHttpError(`Lebar avatar melebihi batas ${policy.maxWidth}px`, BAD_REQUEST);
  }

  if (payload.height && Number(payload.height) > policy.maxHeight) {
    throw createHttpError(`Tinggi avatar melebihi batas ${policy.maxHeight}px`, BAD_REQUEST);
  }

  if (
    payload.format &&
    !policy.allowedFormats.includes(String(payload.format).trim().toLowerCase())
  ) {
    throw createHttpError(
      `Format avatar tidak didukung. Gunakan ${policy.allowedFormats.join(', ')}`,
      BAD_REQUEST
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(payload.secureUrl);
  } catch (_error) {
    throw createHttpError('URL avatar tidak valid', BAD_REQUEST);
  }

  const expectedPath = `/${cloudinaryConfig.cloudName}/image/upload/`;
  if (parsedUrl.hostname !== 'res.cloudinary.com' || !parsedUrl.pathname.includes(expectedPath)) {
    throw createHttpError(
      'URL avatar harus berasal dari Cloudinary image upload yang valid',
      BAD_REQUEST
    );
  }
}

async function createAvatarUploadSignature({ actor, userId, query, envConfig }) {
  assertUserScope({ actor, userId });

  const cloudinaryConfig = resolveCloudinaryConfig(envConfig);
  const avatarPolicy = buildAvatarUploadPolicy(envConfig);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = query.folder || envConfig.cloudinary.uploadFolder;
  const params = {
    allowed_formats: avatarPolicy.allowedFormatsCsv,
    folder,
    timestamp,
    transformation: avatarPolicy.transformation,
  };

  const signature = signCloudinaryParams(params, cloudinaryConfig.apiSecret);

  return {
    cloudName: cloudinaryConfig.cloudName,
    apiKey: cloudinaryConfig.apiKey,
    timestamp,
    folder,
    signature,
    transformation: avatarPolicy.transformation,
    allowed_formats: avatarPolicy.allowedFormatsCsv,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
  };
}

async function saveAvatarUploadResult({ actor, userId, payload }) {
  assertUserScope({ actor, userId });
  const cloudinaryConfig = resolveCloudinaryConfig(env);
  assertAvatarUploadResult(payload, env, cloudinaryConfig);

  const updated = await patientCareRepository.updateUserAvatar({
    userId,
    avatarPhoto: payload.secureUrl,
  });

  if (!updated) {
    throw createHttpError('User tidak ditemukan', NOT_FOUND);
  }

  return {
    userId: updated.user_id,
    avatarPhoto: updated.avatar_photo,
    cloudinaryPublicId: payload.publicId || null,
    updatedAt: toIso(updated.updated_at),
  };
}

module.exports = {
  createAvatarUploadSignature,
  saveAvatarUploadResult,
};
