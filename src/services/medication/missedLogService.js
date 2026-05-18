const prisma = require('../../config/prisma');
const env = require('../../config/env');
const {
  buildMedicationCalendarEvents,
  buildMedicationLogLookup,
  getCurrentDateOnlyInTimeZone,
  toPrismaDate,
  toPrismaTime,
} = require('./shared');

const medicationLogOrderBy = [{ medicationDate: 'desc' }, { createdAt: 'desc' }];

function buildMissedMedicationLogRows({ userId, medications, rangeStart, rangeEnd, logs, todayDate }) {
  const logLookup = buildMedicationLogLookup(logs);
  const rows = [];
  const scheduledKeys = new Set();

  for (const medication of medications) {
    const events = buildMedicationCalendarEvents({
      medication,
      rangeStart,
      rangeEnd,
      logLookup,
    });

    for (const event of events) {
      if (!event.scheduledTime || event.medicationLogId || event.scheduledDate >= todayDate) {
        continue;
      }

      const scheduledKey = `${event.medicationId}|${event.scheduledDate}|${event.scheduledTime}`;
      if (scheduledKeys.has(scheduledKey) || logLookup.has(scheduledKey)) {
        continue;
      }

      scheduledKeys.add(scheduledKey);
      rows.push({
        userId,
        medicationId: event.medicationId,
        status: 'missed',
        medicationDate: toPrismaDate(event.scheduledDate),
        medicationTime: toPrismaTime(event.scheduledTime),
      });
    }
  }

  return rows;
}

async function syncMissedMedicationLogs({ tx = prisma, userId, medications, rangeStart, rangeEnd }) {
  if (!Array.isArray(medications) || medications.length === 0) {
    return [];
  }

  const medicationIds = medications.map((medication) => medication.medicationId);
  const where = {
    userId,
    medicationId: {
      in: medicationIds,
    },
    medicationDate: {
      gte: rangeStart,
      lte: rangeEnd,
    },
  };

  let logs = await tx.medicationLog.findMany({
    where,
    orderBy: medicationLogOrderBy,
  });

  const rows = buildMissedMedicationLogRows({
    userId,
    medications,
    rangeStart,
    rangeEnd,
    logs,
    todayDate: getCurrentDateOnlyInTimeZone(env.schedulers.timeZone),
  });

  if (rows.length > 0) {
    await tx.medicationLog.createMany({
      data: rows,
    });

    logs = await tx.medicationLog.findMany({
      where,
      orderBy: medicationLogOrderBy,
    });
  }

  return logs;
}

module.exports = {
  syncMissedMedicationLogs,
};
