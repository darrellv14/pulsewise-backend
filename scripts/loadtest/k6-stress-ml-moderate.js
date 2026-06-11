import http from 'k6/http';
import { sleep } from 'k6';
import { check } from 'k6';
import { getBaseUrl, getOrLoginUser, jsonHeaders } from './k6-common.js';

export const options = {
  scenarios: {
    ml_moderate: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 3 },
        { duration: '20s', target: 3 },
        { duration: '15s', target: 5 },
        { duration: '20s', target: 5 },
        { duration: '15s', target: 8 },
        { duration: '20s', target: 8 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<12000'],
    'http_req_duration{name:ml_predictions}': ['p(95)<12000'],
    'http_req_duration{name:ml_recommendations}': ['p(95)<12000'],
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
  const headers = jsonHeaders(user.token);
  const baseUrl = getBaseUrl();

  const prediction = http.post(`${baseUrl}/users/${user.userId}/ml-predictions`, '{}', {
    headers,
    tags: { name: 'ml_predictions', suite: 'ml_moderate' },
  });
  assertNamedOk('ml_predictions', prediction);

  const recommendation = http.post(`${baseUrl}/users/${user.userId}/ml-recommendations`, '{}', {
    headers,
    tags: { name: 'ml_recommendations', suite: 'ml_moderate' },
  });
  assertNamedOk('ml_recommendations', recommendation);

  sleep(1);
}
