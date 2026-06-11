import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://127.0.0.1:5000';
const PATIENT_EMAIL = __ENV.K6_PATIENT_EMAIL || 'seed.patient2@pulsewise.local';
const PATIENT_PASSWORD = __ENV.K6_PATIENT_PASSWORD || 'dev12345';
const DOCTOR_EMAIL = __ENV.K6_DOCTOR_EMAIL || 'doctor@pulsewise.local';
const DOCTOR_PASSWORD = __ENV.K6_DOCTOR_PASSWORD || 'dev12345';

export const options = {
  scenarios: {
    rest_prod_bounded: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '20s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '20s', target: 35 },
        { duration: '30s', target: 35 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2500'],
    'http_req_duration{name:auth_me}': ['p(95)<1200'],
    'http_req_duration{name:patient_dashboard}': ['p(95)<2000'],
    'http_req_duration{name:education_categories}': ['p(95)<1200'],
    'http_req_duration{name:education_feed}': ['p(95)<1800'],
    'http_req_duration{name:education_detail}': ['p(95)<1800'],
    'http_req_duration{name:education_comments}': ['p(95)<1800'],
    'http_req_duration{name:doctor_dashboard_patients}': ['p(95)<2500'],
    'http_req_duration{name:ml_readiness}': ['p(95)<2200'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

function assertOk(name, response) {
  check(response, {
    [`${name} status is 200`]: (res) => res.status === 200,
  });
}

function login(email, password) {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    }
  );

  check(response, {
    'login status is 200': (res) => res.status === 200,
  });

  const body = response.json();
  return {
    token: body?.data?.token,
    userId: body?.data?.user?.userId,
  };
}

export function setup() {
  const patient = login(PATIENT_EMAIL, PATIENT_PASSWORD);
  const doctor = login(DOCTOR_EMAIL, DOCTOR_PASSWORD);

  const patientHeaders = { Authorization: `Bearer ${patient.token}` };
  const feed = http.get(`${BASE_URL}/education/articles?sort=latest&limit=5`, {
    headers: patientHeaders,
    tags: { name: 'setup_education_feed' },
  });
  check(feed, {
    'setup education feed status is 200': (res) => res.status === 200,
  });

  const article = feed.json()?.data?.items?.[0] || null;

  return {
    patient,
    doctor,
    articleId: article?.articleId || null,
    articleSlug: article?.slug || null,
  };
}

export default function (data) {
  const patientHeaders = { Authorization: `Bearer ${data.patient.token}` };
  const doctorHeaders = { Authorization: `Bearer ${data.doctor.token}` };

  const authMe = http.get(`${BASE_URL}/auth/me`, {
    headers: patientHeaders,
    tags: { name: 'auth_me', suite: 'rest_prod_bounded' },
  });
  assertOk('auth_me', authMe);

  const patientDashboard = http.get(`${BASE_URL}/users/${data.patient.userId}/dashboard`, {
    headers: patientHeaders,
    tags: { name: 'patient_dashboard', suite: 'rest_prod_bounded' },
  });
  assertOk('patient_dashboard', patientDashboard);

  const categories = http.get(`${BASE_URL}/education/categories`, {
    headers: patientHeaders,
    tags: { name: 'education_categories', suite: 'rest_prod_bounded' },
  });
  assertOk('education_categories', categories);

  const feed = http.get(`${BASE_URL}/education/articles?sort=latest&limit=10`, {
    headers: patientHeaders,
    tags: { name: 'education_feed', suite: 'rest_prod_bounded' },
  });
  assertOk('education_feed', feed);

  if (data.articleSlug) {
    const detail = http.get(`${BASE_URL}/education/articles/${data.articleSlug}`, {
      headers: patientHeaders,
      tags: { name: 'education_detail', suite: 'rest_prod_bounded' },
    });
    assertOk('education_detail', detail);
  }

  if (data.articleId) {
    const comments = http.get(`${BASE_URL}/education/articles/${data.articleId}/comments?limit=10`, {
      headers: patientHeaders,
      tags: { name: 'education_comments', suite: 'rest_prod_bounded' },
    });
    assertOk('education_comments', comments);
  }

  const doctorPatients = http.get(
    `${BASE_URL}/doctors/${data.doctor.userId}/dashboard/patients?page=1&limit=20`,
    {
      headers: doctorHeaders,
      tags: { name: 'doctor_dashboard_patients', suite: 'rest_prod_bounded' },
    }
  );
  assertOk('doctor_dashboard_patients', doctorPatients);

  const readiness = http.get(`${BASE_URL}/users/${data.patient.userId}/ml-readiness`, {
    headers: patientHeaders,
    tags: { name: 'ml_readiness', suite: 'rest_prod_bounded' },
  });
  assertOk('ml_readiness', readiness);

  sleep(1);
}
