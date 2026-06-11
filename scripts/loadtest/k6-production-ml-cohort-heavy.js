import http from 'k6/http';
import { sleep } from 'k6';
import { assertOk, getBaseUrl, getOrLoginUser, jsonHeaders } from './k6-common.js';

export const options = {
  scenarios: {
    ml_prod_cohort_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '20s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '20s', target: 30 },
        { duration: '30s', target: 30 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<20000'],
    'http_req_duration{name:ml_predictions}': ['p(95)<20000'],
    'http_req_duration{name:ml_recommendations}': ['p(95)<20000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

export default function () {
  const user = getOrLoginUser();
  const headers = jsonHeaders(user.token);
  const baseUrl = getBaseUrl();

  const prediction = http.post(`${baseUrl}/users/${user.userId}/ml-predictions`, '{}', {
    headers,
    tags: { name: 'ml_predictions', suite: 'ml_prod_cohort_heavy' },
  });
  assertOk('ml_predictions', prediction);

  const recommendation = http.post(
    `${baseUrl}/users/${user.userId}/ml-recommendations`,
    '{}',
    {
      headers,
      tags: { name: 'ml_recommendations', suite: 'ml_prod_cohort_heavy' },
    }
  );
  assertOk('ml_recommendations', recommendation);

  sleep(1);
}
