const fs = require('fs');
const path = require('path');

const DEFAULT_DJANGO_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_OUTPUT_PATH = path.join('docs', 'archive', 'parity', 'golden-django-5p-30d.json');
const DEFAULT_PATIENT_LIMIT = 5;
const DEFAULT_DAYS = 30;

function ensureFetchAvailable() {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch tidak tersedia. Gunakan Node.js 18+');
  }
}

function getEnv(name, fallback = null) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  return String(value).trim();
}

function mustEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Environment variable wajib belum diisi: ${name}`);
  }
  return value;
}

function toOutputPath(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

function parseSetCookie(setCookieHeaders) {
  const cookieJar = {};
  if (!setCookieHeaders) {
    return cookieJar;
  }

  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

  for (const raw of list) {
    if (!raw || typeof raw !== 'string') {
      continue;
    }

    const pair = raw.split(';')[0];
    const index = pair.indexOf('=');
    if (index <= 0) {
      continue;
    }

    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    cookieJar[key] = value;
  }

  return cookieJar;
}

function getSetCookieHeaders(headers) {
  if (!headers) {
    return [];
  }

  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const single = headers.get('set-cookie');
  if (!single) {
    return [];
  }

  // Fallback split for runtimes that expose combined Set-Cookie string.
  return single.split(/,(?=[^;\s]+=)/g);
}

function mergeCookies(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = value;
  }
}

function cookieHeader(cookieJar) {
  return Object.entries(cookieJar)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function extractCsrfFromHtml(html) {
  const regex = /name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/i;
  const match = regex.exec(html || '');
  return match ? match[1] : null;
}

function toIso(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');
  const withZone = /Z|[-+]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;

  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toDateOnly(value) {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateAge(dateOfBirth) {
  const dob = toDateOnly(dateOfBirth);
  if (!dob) {
    return null;
  }

  const birth = new Date(`${dob}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthNow = now.getUTCMonth();
  const dayNow = now.getUTCDate();
  const monthBirth = birth.getUTCMonth();
  const dayBirth = birth.getUTCDate();

  if (monthNow < monthBirth || (monthNow === monthBirth && dayNow < dayBirth)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function latestNonNull(points, key) {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i][key] !== null && points[i][key] !== undefined) {
      return points[i][key];
    }
  }

  return null;
}

function withinLastDays(isoTimestamp, days) {
  const ts = new Date(isoTimestamp).getTime();
  if (Number.isNaN(ts)) {
    return false;
  }

  const now = Date.now();
  const rangeMs = days * 24 * 60 * 60 * 1000;
  return ts >= now - rangeMs && ts <= now + 5 * 60 * 1000;
}

function normalizeVitalsRows(vitals, days) {
  const rows = Array.isArray(vitals) ? vitals : [];

  const normalized = rows
    .map((row) => ({
      timestamp: toIso(row.timestamp),
      systolicBp: toNumber(row.systolic_bp),
      diastolicBp: toNumber(row.diastolic_bp),
      heartRate: toNumber(row.heart_rate),
      oxygenSaturation: toNumber(row.oxygen_saturation),
      weight: toNumber(row.weight),
      height: toNumber(row.height),
      bmi: toNumber(row.bmi),
    }))
    .filter((row) => row.timestamp)
    .filter((row) => withinLastDays(row.timestamp, days))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const latestVitals = {
    measuredAt: normalized.length ? normalized[normalized.length - 1].timestamp : null,
    systolicBp: latestNonNull(normalized, 'systolicBp'),
    diastolicBp: latestNonNull(normalized, 'diastolicBp'),
    heartRate: latestNonNull(normalized, 'heartRate'),
    oxygenSaturation: latestNonNull(normalized, 'oxygenSaturation'),
    weight: latestNonNull(normalized, 'weight'),
    height: latestNonNull(normalized, 'height'),
    bmi: latestNonNull(normalized, 'bmi'),
  };

  return {
    points: normalized,
    series: {
      timestamps: normalized.map((row) => row.timestamp),
      systolicBp: normalized.map((row) => row.systolicBp),
      diastolicBp: normalized.map((row) => row.diastolicBp),
      heartRate: normalized.map((row) => row.heartRate),
      oxygenSaturation: normalized.map((row) => row.oxygenSaturation),
      weight: normalized.map((row) => row.weight),
      height: normalized.map((row) => row.height),
      bmi: normalized.map((row) => row.bmi),
    },
    latestVitals,
  };
}

function mapStats(reportStats) {
  const source = reportStats || {};

  function mapMetric(metric) {
    const item = source[metric] || {};
    return {
      avg: toNumber(item.avg),
      min: toNumber(item.min),
      max: toNumber(item.max),
    };
  }

  return {
    systolicBp: mapMetric('systolic_bp'),
    diastolicBp: mapMetric('diastolic_bp'),
    heartRate: mapMetric('heart_rate'),
    oxygenSaturation: mapMetric('oxygen_saturation'),
    weight: mapMetric('weight'),
    bmi: mapMetric('bmi'),
  };
}

function mapAbnormalInstances(items) {
  const list = Array.isArray(items) ? items : [];

  return list.map((item) => ({
    timestamp: toIso(item.date),
    details: item.details || {},
  }));
}

function getDateRange(days) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function fetchJson(url, options, label) {
  const response = await fetch(url, options);
  const text = await response.text();

  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`${label} tidak mengembalikan JSON valid`);
  }

  if (!response.ok) {
    throw new Error(`${label} gagal ${response.status}: ${JSON.stringify(parsed)}`);
  }

  return { parsed, response };
}

function parseThresholds(thresholdPyPath) {
  if (!fs.existsSync(thresholdPyPath)) {
    throw new Error(`File threshold tidak ditemukan: ${thresholdPyPath}`);
  }

  const text = fs.readFileSync(thresholdPyPath, 'utf8');
  const regex = /^([A-Z0-9_]+)\s*=\s*([0-9]+(?:\.[0-9]+)?)/gm;
  const result = {};

  let match;
  while ((match = regex.exec(text)) !== null) {
    result[match[1]] = Number(match[2]);
  }

  return result;
}

async function djangoLogin(baseUrl, username, password) {
  const cookieJar = {};
  const loginPageUrl = `${baseUrl}/auth/login/`;

  const loginPage = await fetch(loginPageUrl, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  });

  const loginHtml = await loginPage.text();
  mergeCookies(cookieJar, parseSetCookie(getSetCookieHeaders(loginPage.headers)));

  const csrf = extractCsrfFromHtml(loginHtml) || cookieJar.csrftoken;
  if (!csrf) {
    throw new Error('CSRF token login Django tidak ditemukan');
  }

  const body = new URLSearchParams();
  body.set('username', username);
  body.set('password', password);
  body.set('csrfmiddlewaretoken', csrf);

  const loginSubmit = await fetch(loginPageUrl, {
    method: 'POST',
    headers: {
      Accept: 'text/html',
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: loginPageUrl,
      Cookie: cookieHeader(cookieJar),
    },
    body: body.toString(),
    redirect: 'manual',
  });

  mergeCookies(cookieJar, parseSetCookie(getSetCookieHeaders(loginSubmit.headers)));

  if (!cookieJar.sessionid) {
    const failBody = await loginSubmit.text();
    throw new Error(
      `Login Django gagal, sessionid tidak terbentuk. Response: ${failBody.slice(0, 300)}`
    );
  }

  return cookieJar;
}

async function main() {
  ensureFetchAvailable();

  const djangoBaseUrl = getEnv('PARITY_DJANGO_WEB_BASE_URL', DEFAULT_DJANGO_BASE_URL).replace(
    /\/$/,
    ''
  );
  const djangoUsername = getEnv('PARITY_DJANGO_USERNAME', 'parityadmin');
  const djangoPassword = getEnv('PARITY_DJANGO_PASSWORD', 'parity12345');
  const doctorId = mustEnv('PARITY_DOCTOR_ID');
  const limit = Number(getEnv('PARITY_PATIENT_LIMIT', String(DEFAULT_PATIENT_LIMIT)));
  const days = Number(getEnv('PARITY_DAYS', String(DEFAULT_DAYS)));

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('PARITY_PATIENT_LIMIT harus integer positif');
  }

  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('PARITY_DAYS harus integer positif');
  }

  const outputPath = toOutputPath(getEnv('PARITY_OUTPUT_PATH', DEFAULT_OUTPUT_PATH));
  const thresholdPath = getEnv(
    'PARITY_DJANGO_THRESHOLD_PATH',
    path.join(process.cwd(), '..', 'chf-dashboard', 'hfmonitoring', 'dashboard', 'threshold.py')
  );

  const thresholds = parseThresholds(thresholdPath);
  const cookies = await djangoLogin(djangoBaseUrl, djangoUsername, djangoPassword);
  const authHeader = { Cookie: cookieHeader(cookies), Accept: 'application/json' };

  const listUrl = `${djangoBaseUrl}/api/list-patients/`;
  const listResult = await fetchJson(
    listUrl,
    { method: 'GET', headers: authHeader },
    'Django list patients'
  );
  const patients = (Array.isArray(listResult.parsed) ? listResult.parsed : []).slice(0, limit);

  if (!patients.length) {
    throw new Error('Tidak ada pasien dari endpoint Django /api/list-patients/');
  }

  const dateRange = getDateRange(days);
  const bundles = [];

  for (const patient of patients) {
    const patientId = patient.id;

    const patientJsonUrl = `${djangoBaseUrl}/${patientId}/json/`;
    const patientResult = await fetchJson(
      patientJsonUrl,
      { method: 'GET', headers: authHeader },
      `Django patient json ${patientId}`
    );

    const abnormalUrl = `${djangoBaseUrl}/api/${patientId}/generate-abnormal-report/?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
    const abnormalResult = await fetchJson(
      abnormalUrl,
      { method: 'GET', headers: authHeader },
      `Django abnormal report ${patientId}`
    );

    const patientData = patientResult.parsed || {};
    const vitalsData = normalizeVitalsRows(patientData.vitals || [], days);
    const reportData = Array.isArray(abnormalResult.parsed?.report_data)
      ? abnormalResult.parsed.report_data[0] || {}
      : {};

    const dateOfBirth = toDateOnly(patientData.date_of_birth);

    bundles.push({
      patientId,
      summary: {
        patient: {
          patientId,
          firstName: patientData.first_name || null,
          lastName: patientData.last_name || null,
          email:
            patientData.contacts?.email && patientData.contacts.email !== 'N/A'
              ? patientData.contacts.email
              : null,
          phone:
            patientData.contacts?.phone && patientData.contacts.phone !== 'N/A'
              ? patientData.contacts.phone
              : null,
          dateOfBirth,
          age: calculateAge(dateOfBirth),
          sex: patientData.sex || null,
        },
        latestVitals: vitalsData.latestVitals,
        thresholds,
      },
      vitals: {
        series: vitalsData.series,
        latestVitals: vitalsData.latestVitals,
        thresholds,
      },
      abnormalReport: {
        stats: mapStats(reportData.stats || {}),
        abnormalInstances: mapAbnormalInstances(reportData.abnormal_instances || []),
        thresholds,
      },
    });
  }

  const output = {
    metadata: {
      source: 'django-dashboard-json',
      capturedAt: new Date().toISOString(),
      djangoBaseUrl,
      doctorId,
      days,
      patientCount: bundles.length,
      patientIds: bundles.map((item) => item.patientId),
      djangoUser: djangoUsername,
      capturePaths: {
        list: '/api/list-patients/',
        patientJson: '/{patientId}/json/',
        abnormalReport: '/api/{patientId}/generate-abnormal-report/',
      },
    },
    patients: bundles,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Golden dataset dari Django tersimpan di ${outputPath}`);
}

main().catch((error) => {
  console.error('[capture-golden-from-django]', error.message);
  process.exitCode = 1;
});
