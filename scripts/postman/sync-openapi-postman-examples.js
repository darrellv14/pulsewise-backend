const fs = require('fs');
const path = require('path');
const YAML = require('yamljs');

const ROOT_DIR = path.join(__dirname, '..', '..');
const OPENAPI_PATH = path.join(ROOT_DIR, 'docs', 'api', 'openapi.yaml');
const COLLECTION_PATHS = [
  path.join(ROOT_DIR, 'postman', 'PulseWise-API.postman_collection.json'),
  path.join(ROOT_DIR, 'postman', 'PulseWise-Dashboard-Smoke.postman_collection.json'),
];

const STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
  default: 'Response',
};

const DEFAULTS = {
  uuid: '11111111-1111-4111-8111-111111111111',
  date: '2026-04-10',
  datetime: '2026-04-10T08:15:00.000Z',
  email: 'agus@example.com',
  url: 'https://example.com/resource',
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature',
};

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return clone(right !== undefined ? right : left);
  }

  if (!isPlainObject(left) || !isPlainObject(right)) {
    return clone(right !== undefined ? right : left);
  }

  const merged = { ...clone(left) };
  for (const [key, value] of Object.entries(right)) {
    merged[key] = key in merged ? deepMerge(merged[key], value) : clone(value);
  }

  return merged;
}

function loadOpenApiSpec() {
  return YAML.load(OPENAPI_PATH);
}

function loadCollection(collectionPath) {
  return JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
}

function saveCollection(collectionPath, collection) {
  fs.writeFileSync(collectionPath, `${JSON.stringify(collection, null, 2)}\n`, 'utf8');
}

function getRefName(ref) {
  return String(ref || '').replace('#/components/schemas/', '');
}

function resolveSchema(schema, spec) {
  if (!schema) {
    return null;
  }

  if (schema.$ref) {
    const refName = getRefName(schema.$ref);
    return spec.components?.schemas?.[refName] || null;
  }

  return schema;
}

function guessStringExample(schema, propertyName) {
  if (schema.example !== undefined) {
    return clone(schema.example);
  }

  if (schema.default !== undefined) {
    return clone(schema.default);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return clone(schema.enum[0]);
  }

  if (schema.format === 'uuid') {
    return DEFAULTS.uuid;
  }
  if (schema.format === 'date') {
    return DEFAULTS.date;
  }
  if (schema.format === 'date-time') {
    return DEFAULTS.datetime;
  }
  if (schema.format === 'email') {
    return DEFAULTS.email;
  }
  if (schema.format === 'uri' || schema.format === 'url') {
    return DEFAULTS.url;
  }

  const key = String(propertyName || '').toLowerCase();
  if (key.includes('email')) {
    return DEFAULTS.email;
  }
  if (key.includes('date') && !key.includes('updated')) {
    return DEFAULTS.date;
  }
  if (
    key.includes('time') ||
    key.includes('schedule') ||
    schema.pattern === '^([01]\\d|2[0-3]):([0-5]\\d)$'
  ) {
    return '08:00';
  }
  if (key.includes('token')) {
    return key.includes('pairing') ? 'PWDASH-79F438BA5A36D22D7A4EA247FEC9E928A9CC' : DEFAULTS.jwt;
  }
  if (key.includes('code')) {
    return 'PW-9A8B7C6D5E4F';
  }
  if (key.includes('status')) {
    return 'active';
  }
  if (key.includes('name')) {
    return 'Aspirin';
  }
  if (key.includes('message')) {
    return 'Operation success';
  }
  if (key.includes('color')) {
    return '#22C55E';
  }
  if (key.includes('phone') || key.includes('number')) {
    return '+628123456789';
  }
  if (key.includes('address')) {
    return 'Jalan Sukamaju No. 88, Surabaya';
  }
  if (key.includes('note')) {
    return 'Contoh catatan singkat.';
  }
  if (key.includes('role')) {
    return 'patient';
  }
  if (key.includes('frequency')) {
    return 'daily';
  }

  return 'string';
}

function generateExample(schema, spec, context = {}) {
  if (!schema) {
    return null;
  }

  if (schema.example !== undefined) {
    return clone(schema.example);
  }

  if (schema.examples && typeof schema.examples === 'object') {
    const firstExample = Object.values(schema.examples)[0];
    if (firstExample?.value !== undefined) {
      return clone(firstExample.value);
    }
  }

  if (schema.$ref) {
    const refName = getRefName(schema.$ref);
    if (context.seenRefs?.has(refName)) {
      return null;
    }

    const nextSeen = new Set(context.seenRefs || []);
    nextSeen.add(refName);
    return generateExample(resolveSchema(schema, spec), spec, {
      ...context,
      seenRefs: nextSeen,
      propertyName: refName,
    });
  }

  if (schema.allOf) {
    return schema.allOf.reduce((merged, part) => {
      const partExample = generateExample(part, spec, context);
      if (partExample === null || partExample === undefined) {
        return merged;
      }
      if (merged === null || merged === undefined) {
        return clone(partExample);
      }
      return deepMerge(merged, partExample);
    }, null);
  }

  if (schema.oneOf?.length) {
    return generateExample(schema.oneOf[0], spec, context);
  }

  if (schema.anyOf?.length) {
    return generateExample(schema.anyOf[0], spec, context);
  }

  if (schema.default !== undefined) {
    return clone(schema.default);
  }

  if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
    const output = {};
    for (const [key, propertySchema] of Object.entries(schema.properties || {})) {
      output[key] = generateExample(propertySchema, spec, {
        ...context,
        propertyName: key,
      });
    }

    if (
      Object.keys(output).length === 0 &&
      schema.additionalProperties &&
      schema.additionalProperties !== true
    ) {
      output.example = generateExample(schema.additionalProperties, spec, context);
    }

    return output;
  }

  if (schema.type === 'array') {
    return [generateExample(schema.items, spec, context)];
  }

  if (schema.type === 'integer') {
    if (schema.example !== undefined) {
      return schema.example;
    }
    if (schema.default !== undefined) {
      return schema.default;
    }
    if (schema.minimum !== undefined) {
      return schema.minimum;
    }
    return 1;
  }

  if (schema.type === 'number') {
    if (schema.example !== undefined) {
      return schema.example;
    }
    if (schema.default !== undefined) {
      return schema.default;
    }
    if (schema.minimum !== undefined) {
      return schema.minimum;
    }
    return 1.5;
  }

  if (schema.type === 'boolean') {
    if (schema.example !== undefined) {
      return schema.example;
    }
    if (schema.default !== undefined) {
      return schema.default;
    }
    return true;
  }

  return guessStringExample(schema, context.propertyName);
}

function normalizeRequestUrl(url) {
  const raw = typeof url === 'string' ? url : url?.raw || '';
  const withoutBase = raw.replace(/^{{baseUrl}}/, '');
  const pathOnly = withoutBase.split('?')[0] || '/';
  const normalizedPath = pathOnly || '/';

  return (
    normalizedPath
      .replace(/{{[^}]+}}/g, '{}')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '') || '/'
  );
}

function normalizeOpenApiPath(pathname) {
  return (
    String(pathname || '')
      .replace(/{[^}]+}/g, '{}')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '') || '/'
  );
}

function buildOperationIndex(spec) {
  const index = new Map();

  for (const [pathname, pathItem] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      const key = `${method.toUpperCase()} ${normalizeOpenApiPath(pathname)}`;
      index.set(key, {
        pathname,
        method: method.toUpperCase(),
        operation,
      });
    }
  }

  return index;
}

function statusLabel(statusCode, description) {
  const text = STATUS_TEXT[String(statusCode)] || STATUS_TEXT.default;
  if (description) {
    return `${statusCode} ${description}`;
  }

  return `${statusCode} ${text}`;
}

function serializeResponseBody(example, contentType) {
  if (contentType === 'application/json') {
    return `${JSON.stringify(example, null, 2)}\n`;
  }

  if (typeof example === 'string') {
    return example;
  }

  return `${JSON.stringify(example, null, 2)}\n`;
}

function buildResponseExamplesForOperation(item, operation, spec) {
  const responses = [];

  for (const [statusCode, response] of Object.entries(operation.responses || {})) {
    const content = response.content || {};
    const contentType =
      Object.keys(content).find((type) => type === 'application/json') || Object.keys(content)[0];

    if (!contentType) {
      continue;
    }

    const media = content[contentType];
    const explicitExample =
      media?.example !== undefined
        ? media.example
        : media?.examples && Object.values(media.examples)[0]?.value !== undefined
          ? Object.values(media.examples)[0].value
          : undefined;

    const exampleBody =
      explicitExample !== undefined
        ? clone(explicitExample)
        : generateExample(media?.schema, spec, { propertyName: 'response' });

    responses.push({
      name: statusLabel(statusCode, response.description),
      originalRequest: clone(item.request),
      status: STATUS_TEXT[String(statusCode)] || STATUS_TEXT.default,
      code: Number(statusCode),
      _postman_previewlanguage: contentType === 'application/json' ? 'json' : 'text',
      header: [
        {
          key: 'Content-Type',
          value: contentType,
        },
      ],
      cookie: [],
      body: serializeResponseBody(exampleBody, contentType),
    });
  }

  return responses;
}

function walkItems(items, visitor) {
  for (const item of items || []) {
    if (item.request) {
      visitor(item);
    }
    if (Array.isArray(item.item)) {
      walkItems(item.item, visitor);
    }
  }
}

function syncCollectionExamples(collectionPath, spec) {
  const collection = loadCollection(collectionPath);
  const operationIndex = buildOperationIndex(spec);
  const unmatched = [];
  let updatedCount = 0;

  walkItems(collection.item, (item) => {
    const requestMethod = String(item.request?.method || 'GET').toUpperCase();
    const normalizedRequestPath = normalizeRequestUrl(item.request?.url);
    const operation = operationIndex.get(`${requestMethod} ${normalizedRequestPath}`);

    if (!operation) {
      unmatched.push(`${requestMethod} ${normalizedRequestPath} :: ${item.name}`);
      return;
    }

    item.response = buildResponseExamplesForOperation(item, operation.operation, spec);
    updatedCount += 1;
  });

  saveCollection(collectionPath, collection);

  console.log(
    `[postman-sync] updated ${updatedCount} request example sets in ${path.relative(process.cwd(), collectionPath)}`
  );

  if (unmatched.length > 0) {
    console.warn(`[postman-sync] unmatched requests in ${path.basename(collectionPath)}:`);
    for (const entry of unmatched) {
      console.warn(`- ${entry}`);
    }
  }
}

function main() {
  const spec = loadOpenApiSpec();
  for (const collectionPath of COLLECTION_PATHS) {
    if (fs.existsSync(collectionPath)) {
      syncCollectionExamples(collectionPath, spec);
    }
  }
}

main();
