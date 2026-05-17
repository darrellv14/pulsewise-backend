const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');
const env = require('../../config/env');
const { BAD_GATEWAY, SERVICE_UNAVAILABLE } = require('../../constants/httpStatus');
const { createHttpError } = require('../../utils/httpError');

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const FCM_ENDPOINT_TEMPLATE = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';
const TERMINAL_PROVIDER_ERROR_CODES = new Set([
  'UNREGISTERED',
  'INVALID_ARGUMENT',
  'SENDER_ID_MISMATCH',
]);

function getFcmEndpoint(projectId) {
  return FCM_ENDPOINT_TEMPLATE.replace('%s', projectId);
}

function normalizeFirebaseCredentials() {
  const config = env.firebase || {};

  if (config.serviceAccountPath) {
    if (!fs.existsSync(config.serviceAccountPath)) {
      throw createHttpError(
        'Firebase service account file tidak ditemukan',
        SERVICE_UNAVAILABLE
      );
    }

    return {
      mode: 'file',
      keyFile: config.serviceAccountPath,
      projectId: config.projectId || '',
    };
  }

  if (config.projectId && config.clientEmail && config.privateKey) {
    return {
      mode: 'inline',
      projectId: config.projectId,
      credentials: {
        type: 'service_account',
        project_id: config.projectId,
        private_key_id: config.privateKeyId || undefined,
        private_key: config.privateKey,
        client_email: config.clientEmail,
      },
    };
  }

  throw createHttpError('Konfigurasi Firebase FCM belum lengkap', SERVICE_UNAVAILABLE);
}

async function getFcmAccessToken() {
  const config = normalizeFirebaseCredentials();
  const auth = new GoogleAuth({
    keyFile: config.mode === 'file' ? config.keyFile : undefined,
    credentials: config.mode === 'inline' ? config.credentials : undefined,
    projectId: config.projectId,
    scopes: [FCM_SCOPE],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken =
    typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token || null;

  if (!accessToken) {
    throw createHttpError('Gagal mendapatkan access token Firebase', SERVICE_UNAVAILABLE);
  }

  return {
    accessToken,
    projectId: config.projectId,
  };
}

function buildFcmMessagePayload({ token, title, body, data }) {
  const normalizedData = Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [key, value == null ? '' : String(value)])
  );

  return {
    message: {
      token,
      notification: {
        title,
        body,
      },
      data: normalizedData,
      android: {
        priority: 'high',
        notification: {
          channel_id: env.firebase.androidChannelId || 'pulsewise_reminders',
        },
      },
    },
  };
}

function extractProviderErrorCode(providerPayload) {
  const details = providerPayload?.error?.details;
  if (Array.isArray(details)) {
    const fcmError = details.find((item) => item?.errorCode);
    if (fcmError?.errorCode) {
      return fcmError.errorCode;
    }
  }

  return providerPayload?.error?.status || 'UNKNOWN_FCM_ERROR';
}

async function sendFcmMessage({ token, title, body, data }) {
  const { accessToken, projectId } = await getFcmAccessToken();
  const payload = buildFcmMessagePayload({
    token,
    title,
    body,
    data,
  });

  const response = await fetch(getFcmEndpoint(projectId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let parsedPayload = null;

  try {
    parsedPayload = responseText ? JSON.parse(responseText) : null;
  } catch (_error) {
    parsedPayload = responseText || null;
  }

  if (!response.ok) {
    const providerErrorCode = extractProviderErrorCode(parsedPayload);
    const error = createHttpError('Pengiriman FCM gagal', BAD_GATEWAY, {
      providerErrorCode,
      providerResponse: parsedPayload,
    });
    error.providerErrorCode = providerErrorCode;
    error.providerResponse = parsedPayload;
    error.isTerminalTokenError = TERMINAL_PROVIDER_ERROR_CODES.has(providerErrorCode);
    throw error;
  }

  return {
    providerMessageId: parsedPayload?.name || null,
    providerResponse: parsedPayload,
  };
}

module.exports = {
  sendFcmMessage,
  TERMINAL_PROVIDER_ERROR_CODES,
};
