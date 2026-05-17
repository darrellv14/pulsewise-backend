require('dotenv').config({ override: true });

const BASE_URL = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const PATIENT_EMAIL = process.env.SMOKE_PATIENT_EMAIL || 'seed.patient2@pulsewise.local';
const PASSWORD = process.env.SMOKE_PASSWORD || 'dev12345';
const DEVICE_TOKEN = process.env.SMOKE_FCM_DEVICE_TOKEN || '';
const LOOKAHEAD_MINUTES = Math.max(2, Number(process.env.SMOKE_SCHEDULER_LOOKAHEAD_MINUTES || 2));
const POST_TARGET_WAIT_MS = Math.max(70_000, Number(process.env.SMOKE_SCHEDULER_POST_WAIT_MS || 130_000));

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function floorToUtcMinute(date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      0,
      0
    )
  );
}

function addUtcMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatUtcTime(date) {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (_error) {
    json = { raw: text };
  }

  return {
    status: response.status,
    body: json,
  };
}

async function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

function findTokenItem(response, fcmToken) {
  const items = response.body?.data?.items || [];
  return items.find((item) => item.fcmToken === fcmToken || item.deviceId?.startsWith('smoke-scheduler-'));
}

async function run() {
  if (!DEVICE_TOKEN) {
    throw new Error('Missing SMOKE_FCM_DEVICE_TOKEN');
  }

  const loginResponse = await login(PATIENT_EMAIL, PASSWORD);
  if (loginResponse.status !== 200 || !loginResponse.body?.data?.token) {
    throw new Error(`Patient login gagal (${loginResponse.status})`);
  }

  const token = loginResponse.body.data.token;
  const userId = loginResponse.body.data.user.userId;
  const now = new Date();
  const targetMinute = addUtcMinutes(floorToUtcMinute(now), LOOKAHEAD_MINUTES);
  const scheduledDate = toDateOnly(targetMinute);
  const scheduledTime = formatUtcTime(targetMinute);
  const deviceId = `smoke-scheduler-${Date.now()}`;
  const medicationName = `Scheduler Smoke ${Date.now()}`;
  let createdMedicationId = null;

  const beforeRegister = await request(`/users/${userId}/fcm-tokens`, {
    method: 'POST',
    token,
    body: {
      fcmToken: DEVICE_TOKEN,
      platform: 'android',
      deviceId,
      deviceName: 'Scheduler Smoke Device',
      appVersion: '1.0.0-smoke',
    },
  });

  const tokensBefore = await request(`/users/${userId}/fcm-tokens`, { token });
  const tokenBefore = findTokenItem(tokensBefore, DEVICE_TOKEN);
  const lastSentAtBefore = tokenBefore?.lastSentAt || null;

  const createMedication = await request(`/users/${userId}/medications`, {
    method: 'POST',
    token,
    body: {
      name: medicationName,
      description: 'Auto scheduler smoke test medication',
      conditionTag: 'heart',
      form: 'tablet',
      color: 'white',
      singleDose: 1,
      singleDoseUnit: 'tablet',
      startDate: scheduledDate,
      frequency: 'daily',
      numOfDays: 1,
      intakeTimes: [scheduledTime],
      note: 'Dibuat otomatis untuk menguji scheduler FCM',
    },
  });

  if (createMedication.status !== 201) {
    throw new Error(`Create medication gagal (${createMedication.status})`);
  }

  createdMedicationId = createMedication.body?.data?.medicationId || null;
  const waitUntil = targetMinute.getTime() + POST_TARGET_WAIT_MS;
  const waitMs = Math.max(0, waitUntil - Date.now());
  await sleep(waitMs);

  const tokensAfter = await request(`/users/${userId}/fcm-tokens`, { token });
  const tokenAfter = findTokenItem(tokensAfter, DEVICE_TOKEN);
  const lastSentAtAfter = tokenAfter?.lastSentAt || null;
  const schedulerTriggered =
    Boolean(lastSentAtBefore && lastSentAtAfter && new Date(lastSentAtAfter).getTime() > new Date(lastSentAtBefore).getTime()) ||
    Boolean(!lastSentAtBefore && lastSentAtAfter);

  const summary = {
    baseUrl: BASE_URL,
    patientEmail: PATIENT_EMAIL,
    userId,
    targetMinuteUtc: targetMinute.toISOString(),
    scheduledDate,
    scheduledTime,
    registerTokenStatus: beforeRegister.status,
    createMedicationStatus: createMedication.status,
    createdMedicationId,
    lastSentAtBefore,
    lastSentAtAfter,
    schedulerTriggered,
    tokenSnapshot: tokenAfter || null,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (createdMedicationId) {
    await request(`/users/${userId}/medications/${createdMedicationId}`, {
      method: 'DELETE',
      token,
    });
  }

  if (!schedulerTriggered) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[smoke-fcm-scheduler-stage3] failed', error.message);
  process.exitCode = 1;
});
