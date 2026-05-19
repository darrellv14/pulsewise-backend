import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';

export const DEFAULT_STAGES = [
  { duration: '10s', target: 100 },
  { duration: '15s', target: 100 },
  { duration: '10s', target: 150 },
  { duration: '15s', target: 150 },
  { duration: '10s', target: 200 },
  { duration: '15s', target: 200 },
  { duration: '10s', target: 0 },
];

export const DEFAULT_THRESHOLDS = {
  http_req_failed: ['rate<0.20'],
  http_req_duration: ['p(95)<10000'],
};

const BASE = __ENV.K6_BASE_URL || 'https://api.darrellvalentino.com';
const PASSWORD = __ENV.K6_PASSWORD || 'dev12345';
const COHORT_SIZE = Number(__ENV.K6_COHORT_SIZE || 200);
const EMAIL_PREFIX = __ENV.K6_EMAIL_PREFIX || 'load.patient';
const EMAIL_DOMAIN = __ENV.K6_EMAIL_DOMAIN || 'pulsewise.local';

let authState = null;

function padNumber(value, size = 3) {
  return String(value).padStart(size, '0');
}

function buildPatientEmail(index) {
  return `${EMAIL_PREFIX}${padNumber(index, 3)}@${EMAIL_DOMAIN}`;
}

export function getBaseUrl() {
  return BASE;
}

export function getDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export function getOrLoginUser() {
  if (authState) {
    return authState;
  }

  const vuId = exec.vu.idInTest || 1;
  const cohortIndex = ((vuId - 1) % COHORT_SIZE) + 1;
  const email = buildPatientEmail(cohortIndex);

  const response = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      email,
      password: PASSWORD,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { name: 'login' },
    }
  );

  check(response, {
    'login status is 200': (res) => res.status === 200,
  });

  const body = response.json();
  authState = {
    email,
    token: body?.data?.token,
    userId: body?.data?.user?.userId,
  };

  return authState;
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function assertOk(name, response) {
  check(response, {
    [`${name} status is 200`]: (res) => res.status === 200,
  });
}
