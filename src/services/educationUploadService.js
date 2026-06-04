const crypto = require('crypto');
const env = require('../config/env');
const { EDUCATION_IMAGE_KINDS } = require('../constants/educationEnums');
const { createHttpError } = require('../utils/httpError');

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

function resolveCloudinaryConfig() {
  const fromUrl = parseCloudinaryUrl(env.cloudinary.url);
  const apiKey = env.cloudinary.apiKey || fromUrl?.apiKey || null;
  const apiSecret = env.cloudinary.apiSecret || fromUrl?.apiSecret || null;
  const cloudName = env.cloudinary.cloudName || fromUrl?.cloudName || null;

  if (!apiKey || !apiSecret || !cloudName) {
    throw createHttpError('Konfigurasi Cloudinary belum lengkap', 500);
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

function buildEducationUploadPolicy(kind) {
  const allowedFormats = String(
    env.cloudinary.educationAllowedFormats || env.cloudinary.avatarAllowedFormats || 'jpg,jpeg,png,webp'
  )
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const maxBytes = Math.max(
    1,
    Number(env.cloudinary.educationImageMaxBytes || 5 * 1024 * 1024)
  );
  const transformation =
    kind === EDUCATION_IMAGE_KINDS.INLINE
      ? `c_limit,w_${Math.max(320, Number(env.cloudinary.educationInlineMaxWidth || 1600))},q_${env.cloudinary.educationQuality || 'auto:good'}`
      : `c_limit,w_${Math.max(320, Number(env.cloudinary.educationCoverMaxWidth || 1280))},q_${env.cloudinary.educationQuality || 'auto:good'}`;

  return {
    allowedFormats,
    allowedFormatsCsv: allowedFormats.join(','),
    maxBytes,
    transformation,
  };
}

function resolveUploadFolder(kind) {
  if (kind === EDUCATION_IMAGE_KINDS.INLINE) {
    return env.cloudinary.educationInlineFolder || 'pulsewise/education/inline';
  }

  return env.cloudinary.educationCoverFolder || 'pulsewise/education/covers';
}

function createEducationUploadSignature(kind) {
  const normalizedKind =
    kind === EDUCATION_IMAGE_KINDS.INLINE ? EDUCATION_IMAGE_KINDS.INLINE : EDUCATION_IMAGE_KINDS.COVER;
  const cloudinaryConfig = resolveCloudinaryConfig();
  const policy = buildEducationUploadPolicy(normalizedKind);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = resolveUploadFolder(normalizedKind);
  const params = {
    allowed_formats: policy.allowedFormatsCsv,
    folder,
    timestamp,
    transformation: policy.transformation,
  };
  const signature = signCloudinaryParams(params, cloudinaryConfig.apiSecret);

  return {
    kind: normalizedKind,
    cloudName: cloudinaryConfig.cloudName,
    apiKey: cloudinaryConfig.apiKey,
    timestamp,
    folder,
    signature,
    transformation: policy.transformation,
    allowedFormats: policy.allowedFormats,
    maxBytes: policy.maxBytes,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
  };
}

module.exports = {
  createEducationUploadSignature,
};
