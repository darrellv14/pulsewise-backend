const prisma = require('../../config/prisma');
const { buildPagination, normalizePaginationInput } = require('../../utils/pagination');
const { createHttpError } = require('../../utils/httpError');
const { NOT_FOUND } = require('../../constants/httpStatus');
const { buildMedicationCacheTags, withOptionalCacheStrategy } = require('./cache');
const { syncMissedMedicationLogs } = require('./missedLogService');
const {
  assertPatientScope,
  toMedicationDto,
  toPrismaDate,
  buildMedicationCalendarEvents,
  buildMedicationLogLookup,
} = require('./shared');

async function listMedications({ actor, userId, query }) {
  assertPatientScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const skip = (page - 1) * limit;
  const cacheTags = buildMedicationCacheTags({ userId });

  const [medications, totalItems] = await Promise.all([
    prisma.medication.findMany(
      withOptionalCacheStrategy(
        {
          where: {
            userId,
          },
          include: {
            reminders: {
              orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        },
        cacheTags
      )
    ),
    prisma.medication.count(
      withOptionalCacheStrategy(
        {
          where: {
            userId,
          },
        },
        cacheTags
      )
    ),
  ]);

  return {
    items: medications.map(toMedicationDto),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

async function listMedicationCalendar({ actor, userId, query }) {
  assertPatientScope({ actor, userId });

  const rangeStart = toPrismaDate(query.from);
  const rangeEnd = toPrismaDate(query.to);

  const medications = await prisma.medication.findMany({
    where: {
      userId,
      reminders: {
        some: {},
      },
      OR: [
        {
          startDate: null,
        },
        {
          startDate: {
            lte: rangeEnd,
          },
        },
      ],
    },
    include: {
      reminders: {
        orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
      },
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
  });

  if (medications.length === 0) {
    return {
      range: {
        from: query.from,
        to: query.to,
      },
      totalItems: 0,
      items: [],
    };
  }

  const logs = await syncMissedMedicationLogs({
    tx: prisma,
    userId,
    medications,
    rangeStart,
    rangeEnd,
  });

  const logLookup = buildMedicationLogLookup(logs);
  const items = medications
    .flatMap((medication) =>
      buildMedicationCalendarEvents({
        medication,
        rangeStart,
        rangeEnd,
        logLookup,
      })
    )
    .sort((left, right) => {
      if (left.scheduledDate !== right.scheduledDate) {
        return left.scheduledDate.localeCompare(right.scheduledDate);
      }

      if (left.scheduledTime !== right.scheduledTime) {
        return left.scheduledTime.localeCompare(right.scheduledTime);
      }

      return left.name.localeCompare(right.name);
    });

  return {
    range: {
      from: query.from,
      to: query.to,
    },
    totalItems: items.length,
    items,
  };
}

async function getMedicationById({ actor, userId, medicationId }) {
  assertPatientScope({ actor, userId });
  const cacheTags = buildMedicationCacheTags({ userId, medicationId });

  const medication = await prisma.medication.findFirst(
    withOptionalCacheStrategy(
      {
        where: {
          medicationId,
          userId,
        },
        include: {
          reminders: {
            orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
          },
        },
      },
      cacheTags
    )
  );

  if (!medication) {
    throw createHttpError('Medication tidak ditemukan', NOT_FOUND);
  }

  return toMedicationDto(medication);
}

module.exports = {
  listMedications,
  listMedicationCalendar,
  getMedicationById,
};
