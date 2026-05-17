const { NOT_FOUND } = require('../../constants/httpStatus');
const thresholds = require('../../constants/dashboardThresholds');
const pushNotificationLogRepository = require('../../repositories/pushNotificationLogRepository');
const { normalizeMetricType } = require('../../utils/metricTypes');
const { deliverNotificationToUser } = require('./fcmDeliveryService');

function toIso(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildAbnormalVitalAlertDedupeKey({ userId, metricType, measuredAt, readingId }) {
  return ['abnormal_vital_alert', userId, metricType, measuredAt, readingId].join(':');
}

function resolveAbnormalVitalAlertMetadata({ metricType, valueNumeric, unit }) {
  if (metricType === 'heart_rate') {
    if (valueNumeric > thresholds.HR_NORMAL_MAX) {
      return {
        shouldNotify: true,
        severity: 'warning',
        title: 'Detak jantung di luar batas normal',
        body: `Detak jantung terbaca ${valueNumeric} ${unit || 'bpm'}.`,
      };
    }

    if (valueNumeric < thresholds.HR_NORMAL_MIN) {
      return {
        shouldNotify: true,
        severity: 'warning',
        title: 'Detak jantung di luar batas normal',
        body: `Detak jantung terbaca ${valueNumeric} ${unit || 'bpm'}.`,
      };
    }
  }

  if (metricType === 'oxygen_saturation') {
    if (valueNumeric < thresholds.SPO2_CRITICAL_THRESHOLD) {
      return {
        shouldNotify: true,
        severity: 'critical',
        title: 'Saturasi oksigen berbahaya',
        body: `Saturasi oksigen terbaca ${valueNumeric}${unit || '%'}.`,
      };
    }

    if (valueNumeric < thresholds.SPO2_CAUTION_THRESHOLD) {
      return {
        shouldNotify: true,
        severity: 'warning',
        title: 'Saturasi oksigen perlu diperhatikan',
        body: `Saturasi oksigen terbaca ${valueNumeric}${unit || '%'}.`,
      };
    }
  }

  return {
    shouldNotify: false,
  };
}

async function sendAbnormalVitalAlertBestEffort({ userId, reading }) {
  const metricType = normalizeMetricType(reading.metric_type || reading.metricType);
  const valueNumeric =
    reading.value_numeric !== undefined && reading.value_numeric !== null
      ? Number(reading.value_numeric)
      : reading.valueNumeric !== undefined && reading.valueNumeric !== null
        ? Number(reading.valueNumeric)
        : null;

  if (!metricType || valueNumeric === null || Number.isNaN(valueNumeric)) {
    return false;
  }

  const metadata = resolveAbnormalVitalAlertMetadata({
    metricType,
    valueNumeric,
    unit: reading.unit || null,
  });
  if (!metadata.shouldNotify) {
    return false;
  }

  const measuredAt = toIso(reading.measured_at || reading.measuredAt);
  const readingId = reading.reading_id || reading.readingId;
  const dedupeKey = buildAbnormalVitalAlertDedupeKey({
    userId,
    metricType,
    measuredAt,
    readingId,
  });
  const existingLog = await pushNotificationLogRepository.findPushNotificationLogByDedupeKey(
    dedupeKey
  );
  if (existingLog) {
    return false;
  }

  try {
    await deliverNotificationToUser({
      userId,
      title: metadata.title,
      body: metadata.body,
      notificationType: 'abnormal_vital_alert',
      dedupeKey,
      data: {
        action: 'open_abnormal_vital_alert',
        type: 'abnormal_vital_alert',
        metric: metricType,
        value: String(valueNumeric),
        unit: reading.unit || '',
        severity: metadata.severity,
        measuredAt,
        readingId,
        source: 'pulsewise-abnormal-vital-alert',
      },
    });
    return true;
  } catch (error) {
    if (error?.statusCode === NOT_FOUND) {
      return false;
    }

    console.warn('[FCM] Abnormal vital alert skipped due to delivery error', error);
    return false;
  }
}

function buildMlResultReadyDedupeKey({ patientId, resultId }) {
  return ['ml_result_ready', patientId, resultId].join(':');
}

function buildMlResultReadyRecipientDedupeKey({ recipientUserId, resultId, audience }) {
  return ['ml_result_ready', recipientUserId, resultId, audience].join(':');
}

function buildMlResultReadyPayload({ patientId, result, inferenceType, audience = 'patient' }) {
  const readableType = inferenceType === 'recommendation' ? 'rekomendasi' : 'prediksi';

  if (audience === 'requester') {
    return {
      title: 'Hasil analisis pasien tersedia',
      body: `Hasil ${readableType} terbaru pasien sudah siap dilihat di dashboard.`,
      data: {
        action: 'open_doctor_dashboard_ml_result',
        type: 'ml_result_ready',
        resultId: result.resultId,
        patientId,
        inferenceType,
        requestContext: result.requestContext || null,
        generatedAt: result.generatedAt,
        source: 'pulsewise-ml-result-ready',
      },
    };
  }

  return {
    title: 'Hasil analisis terbaru tersedia',
    body: `Hasil ${readableType} terbaru sudah siap dilihat di aplikasi.`,
    data: {
      action: 'open_ml_result',
      type: 'ml_result_ready',
      resultId: result.resultId,
      patientId,
      inferenceType,
      requestContext: result.requestContext || null,
      generatedAt: result.generatedAt,
      source: 'pulsewise-ml-result-ready',
    },
  };
}

async function sendMlResultReadyNotificationBestEffort({
  patientId,
  requestedByUserId,
  result,
  inferenceType,
}) {
  if (!patientId || !result?.resultId) {
    return false;
  }

  const recipients = [
    {
      userId: patientId,
      audience: 'patient',
    },
  ];

  if (requestedByUserId && requestedByUserId !== patientId) {
    recipients.push({
      userId: requestedByUserId,
      audience: 'requester',
    });
  }

  let delivered = false;

  for (const recipient of recipients) {
    const dedupeKey = buildMlResultReadyRecipientDedupeKey({
      recipientUserId: recipient.userId,
      resultId: result.resultId,
      audience: recipient.audience,
    });
    const existingLog = await pushNotificationLogRepository.findPushNotificationLogByDedupeKey(
      dedupeKey
    );
    if (existingLog) {
      continue;
    }

    const payload = buildMlResultReadyPayload({
      patientId,
      result,
      inferenceType,
      audience: recipient.audience,
    });

    try {
      await deliverNotificationToUser({
        userId: recipient.userId,
        title: payload.title,
        body: payload.body,
        notificationType: 'ml_result_ready',
        dedupeKey,
        data: payload.data,
      });
      delivered = true;
    } catch (error) {
      if (error?.statusCode === NOT_FOUND) {
        continue;
      }

      console.warn('[FCM] ML result ready notification skipped due to delivery error', error);
    }
  }

  return delivered;
}

module.exports = {
  buildAbnormalVitalAlertDedupeKey,
  resolveAbnormalVitalAlertMetadata,
  sendAbnormalVitalAlertBestEffort,
  buildMlResultReadyDedupeKey,
  buildMlResultReadyRecipientDedupeKey,
  buildMlResultReadyPayload,
  sendMlResultReadyNotificationBestEffort,
};
