const prisma = require('../config/prisma');
const { buildPagination, normalizePaginationInput } = require('../utils/pagination');

function toDateOnly(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

function mapInferenceResult(row) {
  if (!row) {
    return null;
  }

  return {
    resultId: row.resultId,
    patientId: row.patientId,
    requestedByUserId: row.requestedByUserId,
    inferenceType: row.inferenceType,
    requestContext: row.requestContext,
    mlVersion: row.mlVersion,
    payloadHash: row.payloadHash,
    payload: row.payload || null,
    sourceSummary: row.sourceSummary || null,
    window: {
      startDate: row.windowStartDate?.toISOString().slice(0, 10) || null,
      endDate: row.windowEndDate?.toISOString().slice(0, 10) || null,
    },
    upstream: {
      endpoint: row.upstreamEndpoint || null,
      status: row.upstreamStatus ?? null,
      body: row.upstreamBody || null,
    },
    generatedAt: row.generatedAt?.toISOString() || null,
    createdAt: row.createdAt?.toISOString() || null,
  };
}

async function createInferenceResult({ patientId, requestedByUserId, payload }) {
  const row = await prisma.patientMlInferenceResult.create({
    data: {
      patientId,
      requestedByUserId: requestedByUserId || null,
      inferenceType: payload.inferenceType,
      requestContext: payload.requestContext || null,
      mlVersion: payload.mlVersion,
      payloadHash: payload.payloadHash,
      payload: payload.payload || null,
      sourceSummary: payload.sourceSummary || null,
      windowStartDate: toDateOnly(payload.window?.startDate),
      windowEndDate: toDateOnly(payload.window?.endDate),
      upstreamEndpoint: payload.upstream?.endpoint || null,
      upstreamStatus: payload.upstream?.status ?? null,
      upstreamBody: payload.upstream?.body || null,
      generatedAt: payload.generatedAt ? new Date(payload.generatedAt) : new Date(),
    },
  });

  return mapInferenceResult(row);
}

async function getLatestInferenceResult({ patientId, inferenceType }) {
  const row = await prisma.patientMlInferenceResult.findFirst({
    where: {
      patientId,
      inferenceType,
    },
    orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return mapInferenceResult(row);
}

async function listInferenceResults({ patientId, inferenceType, query = {} }) {
  const { page, limit } = normalizePaginationInput(query);
  const skip = (page - 1) * limit;
  const where = {
    patientId,
    inferenceType,
  };

  const [rows, totalItems] = await Promise.all([
    prisma.patientMlInferenceResult.findMany({
      where,
      orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.patientMlInferenceResult.count({ where }),
  ]);

  return {
    items: rows.map(mapInferenceResult),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

module.exports = {
  createInferenceResult,
  getLatestInferenceResult,
  listInferenceResults,
};
