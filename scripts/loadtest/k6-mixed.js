import http from 'k6/http';
import { sleep } from 'k6';
import {
  DEFAULT_STAGES,
  DEFAULT_THRESHOLDS,
  assertOk,
  authHeaders,
  getBaseUrl,
  getDateOnly,
  getOrLoginUser,
  jsonHeaders,
} from './k6-common.js';

export const options = {
  stages: DEFAULT_STAGES,
  thresholds: DEFAULT_THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

export default function () {
  const user = getOrLoginUser();
  const headers = authHeaders(user.token);
  const postHeaders = jsonHeaders(user.token);
  const baseUrl = getBaseUrl();
  const date = getDateOnly();

  const authMe = http.get(`${baseUrl}/auth/me`, {
    headers,
    tags: { name: 'auth_me' },
  });
  assertOk('auth_me', authMe);

  const dashboard = http.get(`${baseUrl}/users/${user.userId}/dashboard`, {
    headers,
    tags: { name: 'dashboard' },
  });
  assertOk('dashboard', dashboard);

  const medications = http.get(`${baseUrl}/users/${user.userId}/medications`, {
    headers,
    tags: { name: 'medications' },
  });
  assertOk('medications', medications);

  const calendar = http.get(
    `${baseUrl}/users/${user.userId}/medications/calendar?from=${date}&to=${date}`,
    {
      headers,
      tags: { name: 'med_calendar' },
    }
  );
  assertOk('med_calendar', calendar);

  const diary = http.get(`${baseUrl}/users/${user.userId}/diaries/by-date?date=${date}`, {
    headers,
    tags: { name: 'diary_by_date' },
  });
  assertOk('diary_by_date', diary);

  const readiness = http.get(`${baseUrl}/users/${user.userId}/ml-readiness`, {
    headers,
    tags: { name: 'ml_readiness' },
  });
  assertOk('ml_readiness', readiness);

  const prediction = http.post(`${baseUrl}/users/${user.userId}/ml-predictions`, '{}', {
    headers: postHeaders,
    tags: { name: 'ml_predictions' },
  });
  assertOk('ml_predictions', prediction);

  const recommendation = http.post(
    `${baseUrl}/users/${user.userId}/ml-recommendations`,
    '{}',
    {
      headers: postHeaders,
      tags: { name: 'ml_recommendations' },
    }
  );
  assertOk('ml_recommendations', recommendation);

  sleep(1);
}
