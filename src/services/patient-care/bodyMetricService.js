const { NOT_FOUND } = require('../../constants/httpStatus');
const { normalizeConditionTag } = require('../../constants/enums');
const patientCareRepository = require('../../repositories/patientCareRepository');
const biometricRepository = require('../../repositories/biometricRepository');
const { createHttpError } = require('../../utils/httpError');
const {
  assertUserScope,
  hasOwn,
} = require('./shared');
const { invalidateDiaryAndDashboardCaches } = require('./cache');
const { ensureHeartDiaryByDate } = require('./diaryService');
const { mapBodyMetric, enrichBodyMetricWithLatestVitals } = require('./mappers');

async function createDailyBodyMetric({ actor, userId, diaryId, payload }) {
  assertUserScope({ actor, userId });

  const diary = await patientCareRepository.getHeartDiary({ userId, diaryId });
  if (!diary) {
    throw createHttpError('Heart diary tidak ditemukan', NOT_FOUND);
  }

  const created = await patientCareRepository.createDailyBodyMetric({
    diaryId,
    conditionTag: normalizeConditionTag(payload.conditionTag) ?? null,
    bodyHeight: payload.bodyHeight,
    bodyWeight: payload.bodyWeight,
    bmi: payload.bmi,
    systolicPressure: payload.systolicPressure,
    diastolicPressure: payload.diastolicPressure,
    heartRate: payload.heartRate,
    oxygenSaturation: payload.oxygenSaturation,
    timeStamp: payload.timeStamp || null,
  });

  const latestVitalSnapshot = await biometricRepository.getLatestVitalSnapshot(userId);
  await invalidateDiaryAndDashboardCaches(userId);

  return enrichBodyMetricWithLatestVitals(mapBodyMetric(created), latestVitalSnapshot);
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
      conditionTag: normalizeConditionTag(payload.conditionTag) ?? null,
      bodyHeight: payload.bodyHeight,
      bodyWeight: payload.bodyWeight,
      bmi: payload.bmi,
      systolicPressure: payload.systolicPressure,
      diastolicPressure: payload.diastolicPressure,
      heartRate: payload.heartRate,
      oxygenSaturation: payload.oxygenSaturation,
      timeStamp: resolvedTimeStamp,
    });

    const latestVitalSnapshot = await biometricRepository.getLatestVitalSnapshot(userId);
    await invalidateDiaryAndDashboardCaches(userId);
    return enrichBodyMetricWithLatestVitals(mapBodyMetric(created), latestVitalSnapshot);
  }

  const updated = await patientCareRepository.updateDailyBodyMetric({
    metricId: existingMetric.metric_id,
    conditionTag: hasOwn(payload, 'conditionTag')
      ? normalizeConditionTag(payload.conditionTag)
      : undefined,
    bodyHeight: hasOwn(payload, 'bodyHeight') ? payload.bodyHeight : undefined,
    bodyWeight: hasOwn(payload, 'bodyWeight') ? payload.bodyWeight : undefined,
    bmi: hasOwn(payload, 'bmi') ? payload.bmi : undefined,
    systolicPressure: hasOwn(payload, 'systolicPressure') ? payload.systolicPressure : undefined,
    diastolicPressure: hasOwn(payload, 'diastolicPressure') ? payload.diastolicPressure : undefined,
    heartRate: hasOwn(payload, 'heartRate') ? payload.heartRate : undefined,
    oxygenSaturation: hasOwn(payload, 'oxygenSaturation') ? payload.oxygenSaturation : undefined,
    timeStamp: hasOwn(payload, 'timeStamp') ? resolvedTimeStamp : undefined,
  });

  const latestVitalSnapshot = await biometricRepository.getLatestVitalSnapshot(userId);
  await invalidateDiaryAndDashboardCaches(userId);
  return enrichBodyMetricWithLatestVitals(mapBodyMetric(updated), latestVitalSnapshot);
}

module.exports = {
  createDailyBodyMetric,
  createDailyBodyMetricByDate,
};
