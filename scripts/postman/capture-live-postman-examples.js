const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    const value = next && !next.startsWith('--') ? next : true;

    if (Object.prototype.hasOwnProperty.call(args, key)) {
      const existing = args[key];
      args[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
      continue;
    }

    args[key] = value;
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function flattenItems(items, bucket = []) {
  for (const item of items || []) {
    if (Array.isArray(item.item)) {
      flattenItems(item.item, bucket);
      continue;
    }

    bucket.push(item);
  }

  return bucket;
}

function looksLikeJwt(value) {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)
  );
}

function sanitizeString(value) {
  if (!value) {
    return value;
  }

  if (looksLikeJwt(value)) {
    return '<redacted-jwt>';
  }

  return value.replace(/Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, 'Bearer <redacted-jwt>');
}

function sanitizeJson(value, parentKey = '') {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJson(item, parentKey));
  }

  if (value && typeof value === 'object') {
    const result = {};

    for (const [key, childValue] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey === 'token' ||
        normalizedKey === 'pairingtoken' ||
        normalizedKey === 'registrationtoken' ||
        normalizedKey === 'idtoken'
      ) {
        result[key] = '<redacted-secret>';
        continue;
      }

      result[key] = sanitizeJson(childValue, key);
    }

    return result;
  }

  if (typeof value === 'string') {
    if (
      ['token', 'pairingToken', 'registrationToken', 'idToken'].includes(parentKey) ||
      looksLikeJwt(value)
    ) {
      return '<redacted-secret>';
    }

    return sanitizeString(value);
  }

  return value;
}

function decodeResponseBody(execution) {
  const response = execution?.response;
  if (!response) {
    return null;
  }

  const stream = response.stream;
  if (!stream) {
    return '';
  }

  if (Array.isArray(stream)) {
    return Buffer.from(stream).toString('utf8');
  }

  if (stream?.type === 'Buffer' && Array.isArray(stream.data)) {
    return Buffer.from(stream.data).toString('utf8');
  }

  return String(stream);
}

function parseBodySafely(rawBody) {
  if (!rawBody) {
    return '';
  }

  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    return sanitizeString(rawBody);
  }
}

function buildExampleResponse({ request, execution }) {
  const rawBody = decodeResponseBody(execution);
  const parsedBody = parseBodySafely(rawBody);
  const sanitizedBody = sanitizeJson(parsedBody);

  return {
    name: `${execution.response.code} Live Capture`,
    originalRequest: request,
    status: execution.response.status || 'OK',
    code: execution.response.code,
    _postman_previewlanguage: 'json',
    header: [
      {
        key: 'Content-Type',
        value: execution.response?.header?.members?.find((entry) => entry.key?.toLowerCase() === 'content-type')?.value || 'application/json',
      },
    ],
    cookie: [],
    body:
      typeof sanitizedBody === 'string'
        ? sanitizedBody
        : `${JSON.stringify(sanitizedBody, null, 2)}\n`,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const collectionPath = args.collection;
  const environmentPath = args.environment;
  const folders = Array.isArray(args.folder)
    ? args.folder
    : args.folder
      ? [args.folder]
      : [];

  if (!collectionPath || !environmentPath) {
    throw new Error('Gunakan --collection <path> dan --environment <path>');
  }

  const collection = readJson(collectionPath);
  const items = flattenItems(collection.item);
  const itemByName = new Map(items.map((item) => [item.name, item]));
  const reportPath = path.join(
    os.tmpdir(),
    `newman-live-capture-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );
  const newmanCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const run = spawnSync(
    newmanCommand,
    (() => {
      const commandArgs = [
        'newman',
        'run',
        collectionPath,
        '-e',
        environmentPath,
        '--reporters',
        'json',
        '--reporter-json-export',
        reportPath,
      ];

      for (const folder of folders) {
        commandArgs.push('--folder', folder);
      }

      return commandArgs;
    })(),
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }
  );

  if (run.error) {
    throw run.error;
  }

  if (run.status !== 0) {
    throw new Error(`Newman gagal dengan exit code ${run.status}`);
  }

  const report = readJson(reportPath);
  const executions = report.run?.executions || [];

  for (const execution of executions) {
    const name = execution?.item?.name;
    const existingItem = itemByName.get(name);

    if (!name || !existingItem || !execution.response) {
      continue;
    }

    existingItem.response = [buildExampleResponse({ request: existingItem.request, execution })];
  }

  writeJson(collectionPath, collection);
  fs.rmSync(reportPath, { force: true });
  console.log(`[capture-live-postman-examples] updated ${collectionPath}`);
}

main();
