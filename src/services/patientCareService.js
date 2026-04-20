const crypto = require('crypto');
const {
  BAD_REQUEST,
  FORBIDDEN,
  NOT_FOUND,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
} = require('../constants/httpStatus');
const env = require('../config/env');
const patientCareRepository = require('../repositories/patientCareRepository');
const { buildPagination, normalizePaginationInput } = require('../utils/pagination');

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

function toTimeOnly(value) {
  const iso = toIso(value);
  return iso ? iso.slice(11, 16) : null;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeNullableText(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function combineDateAndTime(diaryDate, time) {
  const [year, month, day] = diaryDate.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0)).toISOString();
}

function resolveDiaryEntryTimestamp({ diaryDate, time, timeStamp }) {
  if (timeStamp) {
    return timeStamp;
  }

  if (time) {
    return combineDateAndTime(diaryDate, time);
  }

  return null;
}

function mapEmergencyContact(row) {
  return {
    emergencyContactId: row.emergency_contact_id,
    userId: row.user_id,
    contactLabel: row.contact_label,
    contactNumber: row.contact_number,
    isPriority: Boolean(row.is_priority),
    createdAt: toIso(row.created_at),
  };
}

function isEmergencyPriorityConflictError(error) {
  return (
    error?.code === '23505' &&
    String(error?.constraint || '').includes('uq_emergency_contacts_single_priority_per_user')
  );
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
    heartRate: row.heart_rate,
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
    time: toTimeOnly(row.time_stamp),
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
    time: toTimeOnly(row.time_stamp),
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

async function mapHeartDiaryDetail(row) {
  const [metrics, symptoms, activities, consumptions] = await Promise.all([
    patientCareRepository.listDailyBodyMetrics(row.diary_id),
    patientCareRepository.listDailySymptoms(row.diary_id),
    patientCareRepository.listDailyActivities(row.diary_id),
    patientCareRepository.listDailyConsumptions(row.diary_id),
  ]);

  return {
    ...mapDiary(row),
    bodyMetrics: metrics.map(mapBodyMetric),
    symptoms: symptoms.map(mapSymptom),
    activities: activities.map(mapActivity),
    consumptions: consumptions.map(mapConsumption),
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

async function listEmergencyContacts({ actor, userId, query }) {
  assertUserScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const offset = (page - 1) * limit;

  const result = await patientCareRepository.listEmergencyContacts({
    userId,
    limit,
    offset,
  });
  return {
    items: result.items.map(mapEmergencyContact),
    pagination: buildPagination({ page, limit, totalItems: result.totalItems }),
  };
}

async function createEmergencyContact({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  if (payload.isPriority) {
    const existingPriority = await patientCareRepository.findPriorityEmergencyContact({ userId });
    if (existingPriority) {
      throw createHttpError('Hanya satu emergency contact yang boleh menjadi prioritas', CONFLICT);
    }
  }

  let created;
  try {
    created = await patientCareRepository.createEmergencyContact({
      userId,
      contactLabel: payload.contactLabel,
      contactNumber: payload.contactNumber,
      isPriority: payload.isPriority,
    });
  } catch (error) {
    if (isEmergencyPriorityConflictError(error)) {
      throw createHttpError('Hanya satu emergency contact yang boleh menjadi prioritas', CONFLICT);
    }

    throw error;
  }

  return mapEmergencyContact(created);
}

async function updateEmergencyContact({ actor, userId, emergencyContactId, payload }) {
  assertUserScope({ actor, userId });

  if (payload.isPriority) {
    const existingPriority = await patientCareRepository.findPriorityEmergencyContact({
      userId,
      excludeEmergencyContactId: emergencyContactId,
    });
    if (existingPriority) {
      throw createHttpError('Hanya satu emergency contact yang boleh menjadi prioritas', CONFLICT);
    }
  }

  let updated;
  try {
    updated = await patientCareRepository.updateEmergencyContact({
      userId,
      emergencyContactId,
      contactLabel: payload.contactLabel !== undefined ? payload.contactLabel : null,
      contactNumber: payload.contactNumber !== undefined ? payload.contactNumber : null,
      isPriority: payload.isPriority !== undefined ? payload.isPriority : null,
    });
  } catch (error) {
    if (isEmergencyPriorityConflictError(error)) {
      throw createHttpError('Hanya satu emergency contact yang boleh menjadi prioritas', CONFLICT);
    }

    throw error;
  }

  if (!updated) {
    throw createHttpError('Emergency contact tidak ditemukan', NOT_FOUND);
  }

  return mapEmergencyContact(updated);
}

async function deleteEmergencyContact({ actor, userId, emergencyContactId }) {
  assertUserScope({ actor, userId });

  const deletedCount = await patientCareRepository.deleteEmergencyContact({
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

  const diary = await patientCareRepository.upsertHeartDiary({
    userId,
    diaryDate: payload.diaryDate,
  });

  return mapDiary(diary);
}

async function listHeartDiaries({ actor, userId, query }) {
  assertUserScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const offset = (page - 1) * limit;

  const result = await patientCareRepository.listHeartDiaries({
    userId,
    startDate: query?.startDate,
    endDate: query?.endDate,
    limit,
    offset,
  });

  return {
    items: result.items.map(mapDiary),
    pagination: buildPagination({ page, limit, totalItems: result.totalItems }),
  };
}

async function getHeartDiaryDetail({ actor, userId, diaryId }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  return mapHeartDiaryDetail(diary);
}

async function getHeartDiaryByDate({ actor, userId, diaryDate }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiaryByDate({ userId, diaryDate });
  if (!diary) {
    return null;
  }

  return mapHeartDiaryDetail(diary);
}

async function ensureHeartDiaryByDate({ userId, diaryDate }) {
  return patientCareRepository.upsertHeartDiary({
    userId,
    diaryDate,
  });
}

async function createDailyBodyMetric({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await patientCareRepository.createDailyBodyMetric({
    diaryId,
    conditionTag: payload.conditionTag || null,
    bodyHeight: payload.bodyHeight,
    bodyWeight: payload.bodyWeight,
    bmi: payload.bmi,
    systolicPressure: payload.systolicPressure,
    diastolicPressure: payload.diastolicPressure,
    heartRate: payload.heartRate,
    timeStamp: payload.timeStamp || null,
  });

  return mapBodyMetric(created);
}

async function createDailyBodyMetricByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const existingMetric = await patientCareRepository.getLatestDailyBodyMetric(diary.diary_id);
  const resolvedTimeStamp = payload.timeStamp || null;

  if (!existingMetric) {
    const created = await patientCareRepository.createDailyBodyMetric({
      diaryId: diary.diary_id,
      conditionTag: normalizeNullableText(payload.conditionTag),
      bodyHeight: payload.bodyHeight,
      bodyWeight: payload.bodyWeight,
      bmi: payload.bmi,
      systolicPressure: payload.systolicPressure,
      diastolicPressure: payload.diastolicPressure,
      heartRate: payload.heartRate,
      timeStamp: resolvedTimeStamp,
    });

    return mapBodyMetric(created);
  }

  const updated = await patientCareRepository.updateDailyBodyMetric({
    metricId: existingMetric.metric_id,
    conditionTag: hasOwn(payload, 'conditionTag')
      ? normalizeNullableText(payload.conditionTag)
      : undefined,
    bodyHeight: hasOwn(payload, 'bodyHeight') ? payload.bodyHeight : undefined,
    bodyWeight: hasOwn(payload, 'bodyWeight') ? payload.bodyWeight : undefined,
    bmi: hasOwn(payload, 'bmi') ? payload.bmi : undefined,
    systolicPressure: hasOwn(payload, 'systolicPressure') ? payload.systolicPressure : undefined,
    diastolicPressure: hasOwn(payload, 'diastolicPressure') ? payload.diastolicPressure : undefined,
    heartRate: hasOwn(payload, 'heartRate') ? payload.heartRate : undefined,
    timeStamp: hasOwn(payload, 'timeStamp') ? resolvedTimeStamp : undefined,
  });

  return mapBodyMetric(updated);
}

async function createDailySymptom({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await patientCareRepository.createDailySymptom({
    diaryId,
    symptomName: payload.symptomName,
    intensity: payload.intensity,
    note: payload.note || null,
    timeStamp: payload.timeStamp || null,
  });

  return mapSymptom(created);
}

async function createDailySymptomByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const created = await patientCareRepository.createDailySymptom({
    diaryId: diary.diary_id,
    symptomName: payload.symptomName,
    intensity: payload.intensity,
    note: normalizeNullableText(payload.note),
    timeStamp: resolveDiaryEntryTimestamp({
      diaryDate: payload.diaryDate,
      time: payload.time,
      timeStamp: payload.timeStamp,
    }),
  });

  return mapSymptom(created);
}

async function createDailyActivity({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await patientCareRepository.createDailyActivity({
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

async function createDailyActivityByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const created = await patientCareRepository.createDailyActivity({
    diaryId: diary.diary_id,
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

  const diary = await patientCareRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await patientCareRepository.createDailyConsumption({
    diaryId,
    type: payload.type || null,
    name: payload.name || null,
    portion: payload.portion || null,
    note: payload.note || null,
    timeStamp: payload.timeStamp || null,
  });

  return mapConsumption(created);
}

async function createDailyConsumptionByDate({ actor, userId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await ensureHeartDiaryByDate({
    userId,
    diaryDate: payload.diaryDate,
  });

  const created = await patientCareRepository.createDailyConsumption({
    diaryId: diary.diary_id,
    type: normalizeNullableText(payload.type),
    name: normalizeNullableText(payload.name),
    portion: normalizeNullableText(payload.portion),
    note: normalizeNullableText(payload.note),
    timeStamp: resolveDiaryEntryTimestamp({
      diaryDate: payload.diaryDate,
      time: payload.time,
      timeStamp: payload.timeStamp,
    }),
  });

  return mapConsumption(created);
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
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  upsertHeartDiary,
  listHeartDiaries,
  getHeartDiaryDetail,
  getHeartDiaryByDate,
  createDailyBodyMetric,
  createDailyBodyMetricByDate,
  createDailySymptom,
  createDailySymptomByDate,
  createDailyActivity,
  createDailyActivityByDate,
  createDailyConsumption,
  createDailyConsumptionByDate,
  createAvatarUploadSignature,
  saveAvatarUploadResult,
};
