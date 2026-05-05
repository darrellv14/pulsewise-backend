const prisma = require('../../config/prisma');
const { buildPagination, normalizePaginationInput } = require('../../utils/pagination');
const {
  assertPatientScope,
  ensureMedicationOwnership,
  toPrismaDate,
  toPrismaTime,
  toMedicationLogDto,
} = require('./shared');

async function listMedicationLogs({ actor, userId, medicationId, query }) {
  assertPatientScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const skip = (page - 1) * limit;

  await ensureMedicationOwnership(prisma, { medicationId, userId });

  const where = {
    userId,
    medicationId,
  };

  if (query?.startDate || query?.endDate) {
    where.medicationDate = {};
  }

  if (query?.startDate) {
    where.medicationDate.gte = toPrismaDate(query.startDate);
  }

  if (query?.endDate) {
    where.medicationDate.lte = toPrismaDate(query.endDate);
  }

  const [logs, totalItems] = await Promise.all([
    prisma.medicationLog.findMany({
      where,
      orderBy: [{ medicationDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.medicationLog.count({
      where,
    }),
  ]);

  return {
    items: logs.map(toMedicationLogDto),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

async function createMedicationLog({ actor, userId, medicationId, payload }) {
  assertPatientScope({ actor, userId });

  const medicationLog = await prisma.$transaction(async (tx) => {
    await ensureMedicationOwnership(tx, { medicationId, userId });

    return tx.medicationLog.create({
      data: {
        userId,
        medicationId,
        status: payload.status || 'taken',
        medicationDate: toPrismaDate(payload.medicationDate),
        medicationTime: payload.medicationTime ? toPrismaTime(payload.medicationTime) : null,
      },
    });
  });

  return toMedicationLogDto(medicationLog);
}

module.exports = {
  listMedicationLogs,
  createMedicationLog,
};
