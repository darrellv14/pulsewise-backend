import http from 'k6/http';
import { sleep } from 'k6';
import {
  DEFAULT_STAGES,
  DEFAULT_THRESHOLDS,
  assertOk,
  getBaseUrl,
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
  const headers = jsonHeaders(user.token);
  const baseUrl = getBaseUrl();

  const prediction = http.post(`${baseUrl}/users/${user.userId}/ml-predictions`, '{}', {
    headers,
    tags: { name: 'ml_predictions' },
  });
  assertOk('ml_predictions', prediction);

  const recommendation = http.post(
    `${baseUrl}/users/${user.userId}/ml-recommendations`,
    '{}',
    {
      headers,
      tags: { name: 'ml_recommendations' },
    }
  );
  assertOk('ml_recommendations', recommendation);

  sleep(1);
}
