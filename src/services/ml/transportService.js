const env = require('../../config/env');
const {
  BAD_GATEWAY,
  SERVICE_UNAVAILABLE,
  GATEWAY_TIMEOUT,
} = require('../../constants/httpStatus');
const { createHttpError } = require('../../utils/httpError');

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '');
}

async function parseJsonSafely(response) {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch (_error) {
    return {
      raw: rawText,
    };
  }
}

async function postJson(url, payload, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestMlEndpoint({ endpointPath, payload, serviceConfig = env.mlService }) {
  const baseUrl = normalizeBaseUrl(serviceConfig.baseUrl);
  const version = Number(serviceConfig.version || 3);
  const timeoutMs = Math.max(1000, Number(serviceConfig.timeoutMs || 20000));
  const endpoint = `${baseUrl}/v${version}${endpointPath}`;

  try {
    const response = await postJson(endpoint, payload, timeoutMs);
    const responseBody = await parseJsonSafely(response);

    if (!response.ok) {
      throw createHttpError('Microservice ML mengembalikan error', BAD_GATEWAY, {
        endpoint,
        upstreamStatus: response.status,
        upstreamBody: responseBody,
      });
    }

    return {
      endpoint,
      status: response.status,
      body: responseBody,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createHttpError('Microservice ML timeout saat memproses request', GATEWAY_TIMEOUT, {
        endpoint,
        timeoutMs,
      });
    }

    if (error.statusCode) {
      throw error;
    }

    throw createHttpError('Microservice ML tidak tersedia atau gagal dihubungi', SERVICE_UNAVAILABLE, {
      endpoint,
      reason: error.message,
    });
  }
}

module.exports = {
  requestMlEndpoint,
};
