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

function toEndOfDate(value) {
  const parsed = toDateOnly(value);
  if (!parsed) {
    return null;
  }

  parsed.setUTCHours(23, 59, 59, 999);
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
    modelKey: row.modelKey,
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

function mapInferenceResultSummary(row) {
  if (!row) {
    return null;
  }

  return {
    resultId: row.resultId,
    patientId: row.patientId,
    requestedByUserId: row.requestedByUserId,
    modelKey: row.modelKey,
    inferenceType: row.inferenceType,
    requestContext: row.requestContext,
    mlVersion: row.mlVersion,
    window: {
      startDate: row.windowStartDate?.toISOString().slice(0, 10) || null,
      endDate: row.windowEndDate?.toISOString().slice(0, 10) || null,
    },
    generatedAt: row.generatedAt?.toISOString() || null,
    createdAt: row.createdAt?.toISOString() || null,
  };
}

async function createInferenceResult({ patientId, requestedByUserId, payload }) {
  const row = await prisma.patientMlInferenceResult.create({
    data: {
      patient: {
        connect: {
          userId: patientId,
        },
      },
      ...(requestedByUserId
        ? {
            requestedByUser: {
              connect: {
                userId: requestedByUserId,
              },
            },
          }
        : {}),
      modelKey: payload.modelKey || 'hfms',
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

async function getLatestInferenceResult({ patientId, inferenceType, modelKey = 'hfms' }) {
  const row = await prisma.patientMlInferenceResult.findFirst({
    where: {
      patientId,
      modelKey,
      inferenceType,
    },
    orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return mapInferenceResult(row);
}

async function getInferenceResultById({ patientId, inferenceType, resultId, modelKey = 'hfms' }) {
  const row = await prisma.patientMlInferenceResult.findFirst({
    where: {
      resultId,
      patientId,
      modelKey,
      inferenceType,
    },
  });

  return mapInferenceResult(row);
}

async function listInferenceResults({ patientId, inferenceType, modelKey = 'hfms', query = {} }) {
  const { page, limit } = normalizePaginationInput(query);
  const skip = (page - 1) * limit;
  const where = {
    patientId,
    modelKey,
    inferenceType,
  };

  if (query.startDate || query.endDate) {
    where.generatedAt = {};

    if (query.startDate) {
      where.generatedAt.gte = toDateOnly(query.startDate);
    }

    if (query.endDate) {
      where.generatedAt.lte = toEndOfDate(query.endDate);
    }
  }

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
    items: rows.map(mapInferenceResultSummary),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

module.exports = {
  createInferenceResult,
  getLatestInferenceResult,
  getInferenceResultById,
  listInferenceResults,
};
