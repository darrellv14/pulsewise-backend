const prisma = require('../config/prisma');

function toNullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapReading(row) {
  if (!row) {
    return null;
  }

  return {
    reading_id: row.readingId,
    user_id: row.userId,
    source: row.source,
    metric_type: row.metricType,
    value_numeric: toNullableNumber(row.valueNumeric),
    unit: row.unit,
    payload: row.payload,
    measured_at: row.measuredAt,
    received_at: row.receivedAt,
  };
}

async function findDuplicateReading({
  userId,
  source,
  metricType,
  measuredAt,
  valueNumeric,
  unit,
}) {
  const row = await prisma.vitalSignReading.findFirst({
    where: {
      userId,
      source,
      metricType: {
        equals: metricType,
        mode: 'insensitive',
      },
      measuredAt: new Date(measuredAt),
      valueNumeric: valueNumeric === null ? null : valueNumeric,
      unit: unit || null,
    },
    orderBy: {
      readingId: 'desc',
    },
  });

  return mapReading(row);
}

async function insertReading({
  userId,
  source,
  metricType,
  valueNumeric,
  unit,
  payload,
  measuredAt,
}) {
  const row = await prisma.vitalSignReading.create({
    data: {
      userId,
      source,
      metricType,
      valueNumeric,
      unit,
      payload,
      measuredAt: new Date(measuredAt),
    },
  });

  return mapReading(row);
}

async function listReadings({ userId, source, metricType, startAt, endAt, limit, offset }) {
  const where = { userId };
  if (source) {
    where.source = source;
  }
  if (metricType) {
    where.metricType = {
      equals: metricType,
      mode: 'insensitive',
    };
  }
  if (startAt || endAt) {
    where.measuredAt = {};
    if (startAt) {
      where.measuredAt.gte = new Date(startAt);
    }
    if (endAt) {
      where.measuredAt.lte = new Date(endAt);
    }
  }

  const rows = await prisma.vitalSignReading.findMany({
    where,
    orderBy: [{ measuredAt: 'desc' }, { readingId: 'desc' }],
    take: limit,
    skip: offset,
  });

  return rows.map(mapReading);
}

async function countReadings({ userId, source, metricType, startAt, endAt }) {
  const where = { userId };
  if (source) {
    where.source = source;
  }
  if (metricType) {
    where.metricType = {
      equals: metricType,
      mode: 'insensitive',
    };
  }
  if (startAt || endAt) {
    where.measuredAt = {};
    if (startAt) {
      where.measuredAt.gte = new Date(startAt);
    }
    if (endAt) {
      where.measuredAt.lte = new Date(endAt);
    }
  }

  return prisma.vitalSignReading.count({ where });
}

module.exports = {
  findDuplicateReading,
  insertReading,
  listReadings,
  countReadings,
};
