const crypto = require('crypto');
const { FORBIDDEN, NOT_FOUND, INTERNAL_SERVER_ERROR } = require('../constants/httpStatus');
const legacyParityRepository = require('../repositories/legacyParityRepository');

function createHttpError(message, statusCode, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }

  return error;
}

function assertUserScope({ actor, userId }) {
  if (!actor) {
    throw createHttpError('Aktor tidak valid', FORBIDDEN);
  }

  if (actor.role === 'admin') {
    return;
  }

  if (actor.userId !== userId) {
    throw createHttpError('Akses user scope ditolak', FORBIDDEN);
  }
}

function toIso(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toDateOnly(value) {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function mapEmergencyContact(row) {
  return {
    emergencyContactId: row.emergency_contact_id,
    userId: row.user_id,
    contactLabel: row.contact_label,
    contactNumber: row.contact_number,
    createdAt: toIso(row.created_at),
  };
}

function mapBodyMetric(row) {
  return {
    metricId: row.metric_id,
    diaryId: row.diary_id,
    conditionTag: row.condition_tag,
    bodyHeight: row.body_height !== null ? Number(row.body_height) : null,
    bodyWeight: row.body_weight !== null ? Number(row.body_weight) : null,
    bmi: row.bmi !== null ? Number(row.bmi) : null,
    systolicPressure: row.systolic_pressure,
    diastolicPressure: row.diastolic_pressure,
    timeStamp: toIso(row.time_stamp),
  };
}

function mapSymptom(row) {
  return {
    symptomId: row.symptom_id,
    diaryId: row.diary_id,
    symptomName: row.symptom_name,
    intensity: row.intensity,
    note: row.note,
    timeStamp: toIso(row.time_stamp),
  };
}

function mapActivity(row) {
  return {
    activityId: row.activity_id,
    diaryId: row.diary_id,
    name: row.name,
    duration: row.duration,
    heartRate: row.heart_rate,
    userFeeling: row.user_feeling,
    note: row.note,
    timeStamp: toIso(row.time_stamp),
  };
}

function mapConsumption(row) {
  return {
    consumptionId: row.consumption_id,
    diaryId: row.diary_id,
    type: row.type,
    name: row.name,
    portion: row.portion,
    note: row.note,
    timeStamp: toIso(row.time_stamp),
  };
}

function mapDiary(row) {
  return {
    diaryId: row.diary_id,
    userId: row.user_id,
    diaryDate: toDateOnly(row.diary_date),
    createdAt: toIso(row.created_at),
  };
}

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

async function listEmergencyContacts({ actor, userId }) {
  assertUserScope({ actor, userId });

  const rows = await legacyParityRepository.listEmergencyContacts(userId);
  return {
    items: rows.map(mapEmergencyContact),
  };
}

async function createEmergencyContact({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const created = await legacyParityRepository.createEmergencyContact({
    userId,
    contactLabel: payload.contactLabel,
    contactNumber: payload.contactNumber,
  });

  return mapEmergencyContact(created);
}

async function updateEmergencyContact({ actor, userId, emergencyContactId, payload }) {
  assertUserScope({ actor, userId });

  const updated = await legacyParityRepository.updateEmergencyContact({
    userId,
    emergencyContactId,
    contactLabel: payload.contactLabel !== undefined ? payload.contactLabel : null,
    contactNumber: payload.contactNumber !== undefined ? payload.contactNumber : null,
  });

  if (!updated) {
    throw createHttpError('Emergency contact tidak ditemukan', NOT_FOUND);
  }

  return mapEmergencyContact(updated);
}

async function deleteEmergencyContact({ actor, userId, emergencyContactId }) {
  assertUserScope({ actor, userId });

  const deletedCount = await legacyParityRepository.deleteEmergencyContact({
    userId,
    emergencyContactId,
  });

  if (!deletedCount) {
    throw createHttpError('Emergency contact tidak ditemukan', NOT_FOUND);
  }

  return {
    emergencyContactId,
  };
}

async function upsertHeartDiary({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await legacyParityRepository.upsertHeartDiary({
    userId,
    diaryDate: payload.diaryDate,
  });

  return mapDiary(diary);
}

async function listHeartDiaries({ actor, userId, query }) {
  assertUserScope({ actor, userId });

  const rows = await legacyParityRepository.listHeartDiaries({
    userId,
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return {
    items: rows.map(mapDiary),
  };
}

async function getHeartDiaryDetail({ actor, userId, diaryId }) {
  assertUserScope({ actor, userId });

  const diary = await legacyParityRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const [metrics, symptoms, activities, consumptions] = await Promise.all([
    legacyParityRepository.listDailyBodyMetrics(diaryId),
    legacyParityRepository.listDailySymptoms(diaryId),
    legacyParityRepository.listDailyActivities(diaryId),
    legacyParityRepository.listDailyConsumptions(diaryId),
  ]);

  return {
    ...mapDiary(diary),
    bodyMetrics: metrics.map(mapBodyMetric),
    symptoms: symptoms.map(mapSymptom),
    activities: activities.map(mapActivity),
    consumptions: consumptions.map(mapConsumption),
  };
}

async function createDailyBodyMetric({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await legacyParityRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await legacyParityRepository.createDailyBodyMetric({
    diaryId,
    conditionTag: payload.conditionTag || null,
    bodyHeight: payload.bodyHeight,
    bodyWeight: payload.bodyWeight,
    bmi: payload.bmi,
    systolicPressure: payload.systolicPressure,
    diastolicPressure: payload.diastolicPressure,
    timeStamp: payload.timeStamp || null,
  });

  return mapBodyMetric(created);
}

async function createDailySymptom({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await legacyParityRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await legacyParityRepository.createDailySymptom({
    diaryId,
    symptomName: payload.symptomName,
    intensity: payload.intensity,
    note: payload.note || null,
    timeStamp: payload.timeStamp || null,
  });

  return mapSymptom(created);
}

async function createDailyActivity({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await legacyParityRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await legacyParityRepository.createDailyActivity({
    diaryId,
    name: payload.name,
    duration: payload.duration,
    heartRate: payload.heartRate,
    userFeeling: payload.userFeeling || null,
    note: payload.note || null,
    timeStamp: payload.timeStamp || null,
  });

  return mapActivity(created);
}

async function createDailyConsumption({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await legacyParityRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await legacyParityRepository.createDailyConsumption({
    diaryId,
    type: payload.type || null,
    name: payload.name || null,
    portion: payload.portion || null,
    note: payload.note || null,
    timeStamp: payload.timeStamp || null,
  });

  return mapConsumption(created);
}

async function createAvatarUploadSignature({ actor, userId, query, envConfig }) {
  assertUserScope({ actor, userId });

  const cloudinaryConfig = resolveCloudinaryConfig(envConfig);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = query.folder || envConfig.cloudinary.uploadFolder;
  const params = {
    folder,
    timestamp,
  };

  const signature = signCloudinaryParams(params, cloudinaryConfig.apiSecret);

  return {
    cloudName: cloudinaryConfig.cloudName,
    apiKey: cloudinaryConfig.apiKey,
    timestamp,
    folder,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
  };
}

async function saveAvatarUploadResult({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const updated = await legacyParityRepository.updateUserAvatar({
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
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  upsertHeartDiary,
  listHeartDiaries,
  getHeartDiaryDetail,
  createDailyBodyMetric,
  createDailySymptom,
  createDailyActivity,
  createDailyConsumption,
  createAvatarUploadSignature,
  saveAvatarUploadResult,
};
