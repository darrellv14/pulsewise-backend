const fs = require('fs');
const path = require('path');

const DEFAULT_NODE_BASE_URL = 'http://localhost:5000/api/v1';
const DEFAULT_OUTPUT_PATH = path.join('docs', 'parity', 'golden-django-5p-30d.json');
const DEFAULT_REPORT_PATH = path.join('docs', 'parity', 'parity-report.json');
const DEFAULT_TOLERANCE_PATH = path.join('docs', 'parity', 'parity-tolerance.json');

const REQUIRED_PATIENT_FIELDS = [
  'patientId',
  'firstName',
  'lastName',
  'email',
  'phone',
  'dateOfBirth',
  'age',
  'sex',
];

const REQUIRED_LATEST_VITAL_FIELDS = [
  'measuredAt',
  'systolicBp',
  'diastolicBp',
  'heartRate',
  'oxygenSaturation',
  'weight',
  'height',
  'bmi',
];

const REQUIRED_SERIES_FIELDS = [
  'timestamps',
  'systolicBp',
  'diastolicBp',
  'heartRate',
  'oxygenSaturation',
  'weight',
  'height',
  'bmi',
];

function ensureFetchAvailable() {
  if (typeof fetch !== 'function') {
    throw new Error(
      'Global fetch tidak tersedia. Gunakan Node.js versi 18+ untuk menjalankan script ini.'
    );
  }
}

function getMode() {
  return process.argv[2] || 'compare';
}

function getEnv(name, fallback = null) {
  const value = process.env[name];
  return value && String(value).trim().length ? String(value).trim() : fallback;
}

function mustGetEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Environment variable wajib belum diisi: ${name}`);
  }
  return value;
}

function resolvePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function mkdirFor(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  mkdirFor(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function requestJson({ baseUrl, endpoint, token, sourceLabel }) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`${sourceLabel} response bukan JSON valid untuk endpoint ${endpoint}`);
  }

  if (!response.ok) {
    throw new Error(
      `${sourceLabel} request gagal ${response.status} untuk ${endpoint}: ${JSON.stringify(payload)}`
    );
  }

  if (!payload || payload.success !== true || !('data' in payload)) {
    throw new Error(
      `${sourceLabel} envelope tidak valid untuk ${endpoint}. Diharapkan { success: true, data: ... }`
    );
  }

  return payload.data;
}

function normalizeEndpointPrefix(baseUrl) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function buildPeriodQuery(days) {
  if (days === 30) {
    return 'timePeriod=last_30_days';
  }

  return `timePeriod=last_${days}_days`;
}

async function collectPatientBundle({ baseUrl, token, doctorId, patientId, days, sourceLabel }) {
  const periodQuery = buildPeriodQuery(days);

  const summary = await requestJson({
    baseUrl,
    token,
    sourceLabel,
    endpoint: `/doctors/${doctorId}/dashboard/patients/${patientId}`,
  });

  const vitals = await requestJson({
    baseUrl,
    token,
    sourceLabel,
    endpoint: `/doctors/${doctorId}/dashboard/patients/${patientId}/vitals?${periodQuery}`,
  });

  const abnormalReport = await requestJson({
    baseUrl,
    token,
    sourceLabel,
    endpoint: `/doctors/${doctorId}/dashboard/patients/${patientId}/abnormal-report?${periodQuery}`,
  });

  return {
    patientId,
    summary,
    vitals,
    abnormalReport,
  };
}

async function resolvePatientIds({ baseUrl, token, doctorId, sourceLabel, limit, patientIdsCsv }) {
  if (patientIdsCsv) {
    return patientIdsCsv
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, limit);
  }

  const list = await requestJson({
    baseUrl,
    token,
    sourceLabel,
    endpoint: `/doctors/${doctorId}/dashboard/patients?page=1&limit=${limit}`,
  });

  const items = Array.isArray(list.items) ? list.items : [];
  return items
    .map((item) => item.patientId)
    .filter(Boolean)
    .slice(0, limit);
}

function toComparableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compareTimestamp(expected, actual, toleranceSeconds) {
  if (expected === null && actual === null) {
    return true;
  }

  if (!expected || !actual) {
    return false;
  }

  const expectedTime = new Date(expected).getTime();
  const actualTime = new Date(actual).getTime();

  if (Number.isNaN(expectedTime) || Number.isNaN(actualTime)) {
    return expected === actual;
  }

  const diffSeconds = Math.abs(expectedTime - actualTime) / 1000;
  return diffSeconds <= toleranceSeconds;
}

function getNumberTolerance(metricName, toleranceConfig) {
  if (!toleranceConfig || !toleranceConfig.number) {
    return 0;
  }

  if (metricName in toleranceConfig.number) {
    return toleranceConfig.number[metricName];
  }

  return toleranceConfig.number.default || 0;
}

function pushMismatch(mismatches, scope, pathKey, expected, actual, reason, tolerance = null) {
  mismatches.push({
    scope,
    path: pathKey,
    expected,
    actual,
    reason,
    tolerance,
  });
}

function compareScalar({
  mismatches,
  scope,
  pathKey,
  expected,
  actual,
  metricName,
  toleranceConfig,
}) {
  if (pathKey.toLowerCase().includes('measuredat') || pathKey.toLowerCase().includes('timestamp')) {
    const timeTolerance = toleranceConfig?.timestamp?.seconds ?? 0;
    if (!compareTimestamp(expected, actual, timeTolerance)) {
      pushMismatch(
        mismatches,
        scope,
        pathKey,
        expected,
        actual,
        'timestamp-mismatch',
        timeTolerance
      );
    }
    return;
  }

  const expectedNumber = toComparableNumber(expected);
  const actualNumber = toComparableNumber(actual);
  const bothNumberLike = expectedNumber !== null && actualNumber !== null;

  if (bothNumberLike) {
    const tolerance = getNumberTolerance(metricName || pathKey.split('.').pop(), toleranceConfig);
    const diff = Math.abs(expectedNumber - actualNumber);
    if (diff > tolerance) {
      pushMismatch(
        mismatches,
        scope,
        pathKey,
        expected,
        actual,
        'numeric-out-of-tolerance',
        tolerance
      );
    }
    return;
  }

  if (expected !== actual) {
    pushMismatch(mismatches, scope, pathKey, expected, actual, 'value-mismatch');
  }
}

function compareLatestVitals(expected, actual, mismatches, scope, toleranceConfig) {
  for (const field of REQUIRED_LATEST_VITAL_FIELDS) {
    compareScalar({
      mismatches,
      scope,
      pathKey: `latestVitals.${field}`,
      expected: expected?.[field] ?? null,
      actual: actual?.[field] ?? null,
      metricName: field,
      toleranceConfig,
    });
  }
}

function compareIdentity(expected, actual, mismatches, scope, toleranceConfig) {
  for (const field of REQUIRED_PATIENT_FIELDS) {
    compareScalar({
      mismatches,
      scope,
      pathKey: `patient.${field}`,
      expected: expected?.[field] ?? null,
      actual: actual?.[field] ?? null,
      metricName: field,
      toleranceConfig,
    });
  }
}

function compareSeries(expected, actual, mismatches, scope, toleranceConfig) {
  const allowTrailingNullPadding = Boolean(toleranceConfig?.array?.allowTrailingNullPadding);

  for (const field of REQUIRED_SERIES_FIELDS) {
    const expectedArray = Array.isArray(expected?.[field]) ? expected[field] : [];
    const actualArray = Array.isArray(actual?.[field]) ? actual[field] : [];

    const hasLengthMismatch = expectedArray.length !== actualArray.length;
    if (hasLengthMismatch) {
      let toleratedPadding = false;

      if (allowTrailingNullPadding) {
        const longer = expectedArray.length > actualArray.length ? expectedArray : actualArray;
        const shorterLength = Math.min(expectedArray.length, actualArray.length);
        const trailing = longer.slice(shorterLength);
        toleratedPadding = trailing.every((value) => value === null || value === undefined);
      }

      if (!toleratedPadding) {
        pushMismatch(
          mismatches,
          scope,
          `series.${field}.length`,
          expectedArray.length,
          actualArray.length,
          'array-length-mismatch'
        );
      }
    }

    const length = Math.min(expectedArray.length, actualArray.length);
    for (let index = 0; index < length; index += 1) {
      compareScalar({
        mismatches,
        scope,
        pathKey: `series.${field}[${index}]`,
        expected: expectedArray[index],
        actual: actualArray[index],
        metricName: field,
        toleranceConfig,
      });
    }
  }
}

function compareStats(expected, actual, mismatches, scope, toleranceConfig) {
  const metricKeys = new Set([...Object.keys(expected || {}), ...Object.keys(actual || {})]);

  for (const metric of metricKeys) {
    for (const statField of ['avg', 'min', 'max']) {
      compareScalar({
        mismatches,
        scope,
        pathKey: `stats.${metric}.${statField}`,
        expected: expected?.[metric]?.[statField] ?? null,
        actual: actual?.[metric]?.[statField] ?? null,
        metricName: statField,
        toleranceConfig,
      });
    }
  }
}

function compareThresholds(expected, actual, mismatches, scope, toleranceConfig) {
  const thresholdKeys = new Set([...Object.keys(expected || {}), ...Object.keys(actual || {})]);

  for (const key of thresholdKeys) {
    compareScalar({
      mismatches,
      scope,
      pathKey: `thresholds.${key}`,
      expected: expected?.[key] ?? null,
      actual: actual?.[key] ?? null,
      metricName: key,
      toleranceConfig,
    });
  }
}

function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function normalizeDetailValues(details) {
  const source = details || {};
  return Object.values(source)
    .map((value) =>
      String(value || '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean)
    .sort();
}

function sortAbnormalInstances(items) {
  return [...items].sort((a, b) => {
    const leftTime = String(a?.timestamp || '');
    const rightTime = String(b?.timestamp || '');

    if (leftTime !== rightTime) {
      return leftTime.localeCompare(rightTime);
    }

    return stableStringify(a?.details || {}).localeCompare(stableStringify(b?.details || {}));
  });
}

function compareAbnormalInstances(expected, actual, mismatches, scope, toleranceConfig) {
  const expectedList = sortAbnormalInstances(Array.isArray(expected) ? expected : []);
  const actualList = sortAbnormalInstances(Array.isArray(actual) ? actual : []);

  if (expectedList.length !== actualList.length) {
    pushMismatch(
      mismatches,
      scope,
      'abnormalInstances.length',
      expectedList.length,
      actualList.length,
      'array-length-mismatch'
    );
  }

  const length = Math.min(expectedList.length, actualList.length);
  for (let index = 0; index < length; index += 1) {
    const expectedItem = expectedList[index] || {};
    const actualItem = actualList[index] || {};

    const timeTolerance = toleranceConfig?.timestamp?.seconds ?? 0;
    if (
      !compareTimestamp(expectedItem.timestamp ?? null, actualItem.timestamp ?? null, timeTolerance)
    ) {
      pushMismatch(
        mismatches,
        scope,
        `abnormalInstances[${index}].timestamp`,
        expectedItem.timestamp ?? null,
        actualItem.timestamp ?? null,
        'timestamp-mismatch',
        timeTolerance
      );
    }

    const expectedDetails = stableStringify(expectedItem.details || {});
    const actualDetails = stableStringify(actualItem.details || {});
    const expectedValues = normalizeDetailValues(expectedItem.details || {});
    const actualValues = normalizeDetailValues(actualItem.details || {});

    if (
      expectedDetails !== actualDetails &&
      JSON.stringify(expectedValues) !== JSON.stringify(actualValues)
    ) {
      pushMismatch(
        mismatches,
        scope,
        `abnormalInstances[${index}].details`,
        expectedItem.details || null,
        actualItem.details || null,
        'value-mismatch'
      );
    }
  }
}

async function captureGoldenDataset() {
  ensureFetchAvailable();

  const djangoBaseUrl = normalizeEndpointPrefix(mustGetEnv('PARITY_DJANGO_BASE_URL'));
  const djangoToken = mustGetEnv('PARITY_DJANGO_TOKEN');
  const doctorId = mustGetEnv('PARITY_DOCTOR_ID');

  const limit = Number(getEnv('PARITY_PATIENT_LIMIT', '5'));
  const days = Number(getEnv('PARITY_DAYS', '30'));
  const patientIdsCsv = getEnv('PARITY_PATIENT_IDS', null);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('PARITY_PATIENT_LIMIT harus integer positif');
  }

  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('PARITY_DAYS harus integer positif');
  }

  const outputPath = resolvePath(getEnv('PARITY_OUTPUT_PATH', DEFAULT_OUTPUT_PATH));

  const patientIds = await resolvePatientIds({
    baseUrl: djangoBaseUrl,
    token: djangoToken,
    doctorId,
    sourceLabel: 'Django',
    limit,
    patientIdsCsv,
  });

  if (!patientIds.length) {
    throw new Error('Tidak ada patientId yang berhasil diambil dari Django untuk golden dataset');
  }

  const patients = [];
  for (const patientId of patientIds) {
    const bundle = await collectPatientBundle({
      baseUrl: djangoBaseUrl,
      token: djangoToken,
      doctorId,
      patientId,
      days,
      sourceLabel: 'Django',
    });
    patients.push(bundle);
  }

  const dataset = {
    metadata: {
      source: 'django',
      capturedAt: new Date().toISOString(),
      baseUrl: djangoBaseUrl,
      doctorId,
      days,
      patientCount: patients.length,
      patientIds,
      endpoints: {
        list: `/doctors/${doctorId}/dashboard/patients?page=1&limit=${limit}`,
        summary: `/doctors/${doctorId}/dashboard/patients/{patientId}`,
        vitals: `/doctors/${doctorId}/dashboard/patients/{patientId}/vitals?${buildPeriodQuery(days)}`,
        abnormalReport: `/doctors/${doctorId}/dashboard/patients/{patientId}/abnormal-report?${buildPeriodQuery(days)}`,
      },
    },
    patients,
  };

  writeJson(outputPath, dataset);
  console.log(`Golden dataset tersimpan di ${outputPath}`);
}

async function compareWithNode() {
  ensureFetchAvailable();

  const nodeBaseUrl = normalizeEndpointPrefix(
    getEnv('PARITY_NODE_BASE_URL', DEFAULT_NODE_BASE_URL)
  );
  const nodeToken = mustGetEnv('PARITY_NODE_TOKEN');
  const doctorId = mustGetEnv('PARITY_DOCTOR_ID');

  const inputPath = resolvePath(getEnv('PARITY_INPUT_PATH', DEFAULT_OUTPUT_PATH));
  const reportPath = resolvePath(getEnv('PARITY_REPORT_PATH', DEFAULT_REPORT_PATH));
  const tolerancePath = resolvePath(getEnv('PARITY_TOLERANCE_PATH', DEFAULT_TOLERANCE_PATH));

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Golden dataset tidak ditemukan: ${inputPath}`);
  }

  if (!fs.existsSync(tolerancePath)) {
    throw new Error(`File toleransi tidak ditemukan: ${tolerancePath}`);
  }

  const golden = readJson(inputPath);
  const toleranceConfig = readJson(tolerancePath);

  if (!Array.isArray(golden.patients) || golden.patients.length === 0) {
    throw new Error('Golden dataset tidak memiliki data pasien untuk dibandingkan');
  }

  const comparison = {
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeBaseUrl,
      doctorId,
      sourceDatasetPath: inputPath,
      tolerancePath,
      patientCount: golden.patients.length,
    },
    summary: {
      totalPatients: golden.patients.length,
      passedPatients: 0,
      failedPatients: 0,
      totalMismatches: 0,
    },
    patients: [],
  };

  for (const expected of golden.patients) {
    const patientId = expected.patientId;
    const days = Number(golden.metadata?.days || 30);

    const actual = await collectPatientBundle({
      baseUrl: nodeBaseUrl,
      token: nodeToken,
      doctorId,
      patientId,
      days,
      sourceLabel: 'Node',
    });

    const mismatches = [];
    const scope = `patient:${patientId}`;

    compareIdentity(
      expected.summary?.patient || {},
      actual.summary?.patient || {},
      mismatches,
      scope,
      toleranceConfig
    );

    compareLatestVitals(
      expected.summary?.latestVitals || {},
      actual.summary?.latestVitals || {},
      mismatches,
      scope,
      toleranceConfig
    );

    compareThresholds(
      expected.summary?.thresholds || {},
      actual.summary?.thresholds || {},
      mismatches,
      scope,
      toleranceConfig
    );

    compareSeries(
      expected.vitals?.series || {},
      actual.vitals?.series || {},
      mismatches,
      scope,
      toleranceConfig
    );

    compareLatestVitals(
      expected.vitals?.latestVitals || {},
      actual.vitals?.latestVitals || {},
      mismatches,
      scope,
      toleranceConfig
    );

    compareThresholds(
      expected.vitals?.thresholds || {},
      actual.vitals?.thresholds || {},
      mismatches,
      scope,
      toleranceConfig
    );

    compareStats(
      expected.abnormalReport?.stats || {},
      actual.abnormalReport?.stats || {},
      mismatches,
      scope,
      toleranceConfig
    );

    compareThresholds(
      expected.abnormalReport?.thresholds || {},
      actual.abnormalReport?.thresholds || {},
      mismatches,
      scope,
      toleranceConfig
    );

    compareAbnormalInstances(
      expected.abnormalReport?.abnormalInstances || [],
      actual.abnormalReport?.abnormalInstances || [],
      mismatches,
      scope,
      toleranceConfig
    );

    const patientResult = {
      patientId,
      passed: mismatches.length === 0,
      mismatchCount: mismatches.length,
      mismatches,
    };

    comparison.patients.push(patientResult);
    comparison.summary.totalMismatches += mismatches.length;

    if (patientResult.passed) {
      comparison.summary.passedPatients += 1;
    } else {
      comparison.summary.failedPatients += 1;
    }
  }

  writeJson(reportPath, comparison);

  console.log(`Parity report tersimpan di ${reportPath}`);
  console.log(
    `Result: ${comparison.summary.passedPatients}/${comparison.summary.totalPatients} pasien pass, mismatch total ${comparison.summary.totalMismatches}`
  );

  if (comparison.summary.failedPatients > 0) {
    process.exitCode = 1;
  }
}

function printUsage() {
  console.log('Usage: node scripts/dashboard-parity.js <capture|compare>');
  console.log(
    'Required env (capture): PARITY_DJANGO_BASE_URL, PARITY_DJANGO_TOKEN, PARITY_DOCTOR_ID'
  );
  console.log('Required env (compare): PARITY_NODE_TOKEN, PARITY_DOCTOR_ID');
  console.log(
    'Optional env: PARITY_NODE_BASE_URL, PARITY_PATIENT_LIMIT, PARITY_DAYS, PARITY_PATIENT_IDS'
  );
  console.log(
    'Optional env: PARITY_OUTPUT_PATH, PARITY_INPUT_PATH, PARITY_REPORT_PATH, PARITY_TOLERANCE_PATH'
  );
}

async function main() {
  const mode = getMode();

  if (mode === 'capture') {
    await captureGoldenDataset();
    return;
  }

  if (mode === 'compare') {
    await compareWithNode();
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('[dashboard-parity]', error.message);
  process.exitCode = 1;
});
