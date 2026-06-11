import http from 'k6/http';
import { sleep } from 'k6';
import { check } from 'k6';
import { authHeaders, getBaseUrl, getDateOnly, getOrLoginUser } from './k6-common.js';

export const options = {
  scenarios: {
    rest_bounded: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 25 },
        { duration: '30s', target: 25 },
        { duration: '20s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '20s', target: 75 },
        { duration: '30s', target: 75 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2500'],
    'http_req_duration{name:auth_me}': ['p(95)<1000'],
    'http_req_duration{name:dashboard}': ['p(95)<2500'],
    'http_req_duration{name:medications}': ['p(95)<1500'],
    'http_req_duration{name:med_calendar}': ['p(95)<1500'],
    'http_req_duration{name:diary_by_date}': ['p(95)<1500'],
    'http_req_duration{name:ml_readiness}': ['p(95)<2000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

function assertNamedOk(name, response) {
  check(response, {
    [`${name} status is 200`]: (res) => res.status === 200,
  });
}

export default function () {
  const user = getOrLoginUser();
  const headers = authHeaders(user.token);
  const baseUrl = getBaseUrl();
  const date = getDateOnly();

  const authMe = http.get(`${baseUrl}/auth/me`, {
    headers,
    tags: { name: 'auth_me', suite: 'rest_bounded' },
  });
  assertNamedOk('auth_me', authMe);

  const dashboard = http.get(`${baseUrl}/users/${user.userId}/dashboard`, {
    headers,
    tags: { name: 'dashboard', suite: 'rest_bounded' },
  });
  assertNamedOk('dashboard', dashboard);

  const medications = http.get(`${baseUrl}/users/${user.userId}/medications`, {
    headers,
    tags: { name: 'medications', suite: 'rest_bounded' },
  });
  assertNamedOk('medications', medications);

  const calendar = http.get(
    `${baseUrl}/users/${user.userId}/medications/calendar?from=${date}&to=${date}`,
    {
      headers,
      tags: { name: 'med_calendar', suite: 'rest_bounded' },
    }
  );
  assertNamedOk('med_calendar', calendar);

  const diary = http.get(`${baseUrl}/users/${user.userId}/diaries/by-date?date=${date}`, {
    headers,
    tags: { name: 'diary_by_date', suite: 'rest_bounded' },
  });
  assertNamedOk('diary_by_date', diary);

  const readiness = http.get(`${baseUrl}/users/${user.userId}/ml-readiness`, {
    headers,
    tags: { name: 'ml_readiness', suite: 'rest_bounded' },
  });
  assertNamedOk('ml_readiness', readiness);

  sleep(1);
}
