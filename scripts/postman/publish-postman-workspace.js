const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.getpostman.com';
const ROOT_DIR = path.join(__dirname, '..', '..');

const WORKSPACE_ID = process.env.POSTMAN_WORKSPACE_ID || '';
const API_KEY = process.env.POSTMAN_API_KEY || '';

const COLLECTION_SPECS = [
  {
    filePath: path.join(ROOT_DIR, 'postman', 'PulseWise-API.postman_collection.json'),
    name: 'PulseWise API (Canonical)',
  },
  {
    filePath: path.join(ROOT_DIR, 'postman', 'PulseWise-Dashboard-Smoke.postman_collection.json'),
    name: 'PulseWise Dashboard Smoke',
  },
];

const ENVIRONMENT_SPECS = [
  {
    filePath: path.join(ROOT_DIR, 'postman', 'PulseWise-Local.postman_environment.json'),
    name: 'PulseWise Local',
  },
  {
    filePath: path.join(ROOT_DIR, 'postman', 'environments', 'PulseWise-Production.postman_environment.json'),
    name: 'PulseWise Production',
  },
];

function ensureConfig() {
  if (!WORKSPACE_ID) {
    throw new Error('Missing POSTMAN_WORKSPACE_ID');
  }

  if (!API_KEY) {
    throw new Error('Missing POSTMAN_API_KEY');
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function requestJson(method, pathname, body) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(`Postman API ${method} ${pathname} failed with ${response.status}`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function loadWorkspace() {
  return requestJson('GET', `/workspaces/${WORKSPACE_ID}`);
}

function normalizeCollection(collection, name) {
  const output = { ...collection };
  output.info = {
    ...(output.info || {}),
    name,
  };
  return output;
}

function normalizeEnvironment(environment, name) {
  return {
    ...environment,
    name,
  };
}

async function upsertCollection(existingCollections, spec) {
  const collection = normalizeCollection(readJson(spec.filePath), spec.name);
  const match = existingCollections.find((item) => item.name === spec.name);

  if (match) {
    await requestJson('PUT', `/collections/${match.uid}`, {
      collection,
    });
    console.log(`[postman-publish] updated collection: ${spec.name}`);
    return;
  }

  await requestJson('POST', `/collections?workspace=${WORKSPACE_ID}`, {
    collection,
  });
  console.log(`[postman-publish] created collection: ${spec.name}`);
}

async function upsertEnvironment(existingEnvironments, spec) {
  const environment = normalizeEnvironment(readJson(spec.filePath), spec.name);
  const match = existingEnvironments.find((item) => item.name === spec.name);

  if (match) {
    await requestJson('PUT', `/environments/${match.uid}`, {
      environment,
    });
    console.log(`[postman-publish] updated environment: ${spec.name}`);
    return;
  }

  await requestJson('POST', `/environments?workspace=${WORKSPACE_ID}`, {
    environment,
  });
  console.log(`[postman-publish] created environment: ${spec.name}`);
}

async function main() {
  ensureConfig();
  const workspace = await loadWorkspace();
  const existingCollections = workspace.workspace.collections || [];
  const existingEnvironments = workspace.workspace.environments || [];

  for (const spec of COLLECTION_SPECS) {
    await upsertCollection(existingCollections, spec);
  }

  for (const spec of ENVIRONMENT_SPECS) {
    await upsertEnvironment(existingEnvironments, spec);
  }
}

main().catch((error) => {
  console.error('[postman-publish] failed');
  console.error(error.payload ? JSON.stringify(error.payload, null, 2) : error);
  process.exitCode = 1;
});
