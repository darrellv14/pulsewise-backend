import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://127.0.0.1:5000';
const PATIENT_EMAIL = __ENV.K6_PATIENT_EMAIL || 'seed.patient2@pulsewise.local';
const PATIENT_PASSWORD = __ENV.K6_PATIENT_PASSWORD || 'dev12345';

export const options = {
  scenarios: {
    ml_prod_bounded: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 2 },
        { duration: '25s', target: 2 },
        { duration: '15s', target: 4 },
        { duration: '25s', target: 4 },
        { duration: '15s', target: 6 },
        { duration: '25s', target: 6 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<15000'],
    'http_req_duration{name:ml_predictions}': ['p(95)<15000'],
    'http_req_duration{name:ml_recommendations}': ['p(95)<15000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

function assertOk(name, response) {
  check(response, {
    [`${name} status is 200`]: (res) => res.status === 200,
  });
}

export function setup() {
  const login = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: PATIENT_EMAIL,
      password: PATIENT_PASSWORD,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { name: 'login' },
    }
  );

  check(login, {
    'login status is 200': (res) => res.status === 200,
  });

  const body = login.json();
  return {
    token: body?.data?.token,
    userId: body?.data?.user?.userId,
  };
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  const prediction = http.post(`${BASE_URL}/users/${data.userId}/ml-predictions`, '{}', {
    headers,
    tags: { name: 'ml_predictions', suite: 'ml_prod_bounded' },
  });
  assertOk('ml_predictions', prediction);

  const recommendation = http.post(
    `${BASE_URL}/users/${data.userId}/ml-recommendations`,
    '{}',
    {
      headers,
      tags: { name: 'ml_recommendations', suite: 'ml_prod_bounded' },
    }
  );
  assertOk('ml_recommendations', recommendation);

  sleep(1);
}
