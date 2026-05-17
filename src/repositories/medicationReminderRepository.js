const prisma = require('../config/prisma');
const { toPrismaDate, toPrismaTime } = require('../services/medication/shared');

async function listDueMedicationReminderCandidates({ scheduledDate, scheduledTime, dayOfWeek }) {
  const targetDate = toPrismaDate(scheduledDate);
  const targetTime = toPrismaTime(scheduledTime);

  return prisma.reminder.findMany({
    where: {
      scheduleTime: targetTime,
      OR: [
        {
          medication: {
            frequency: 'daily',
          },
        },
        {
          medication: {
            frequency: 'weekly',
          },
          dayOfWeek,
        },
      ],
      medication: {
        OR: [
          {
            startDate: null,
          },
          {
            startDate: {
              lte: targetDate,
            },
          },
        ],
      },
    },
    include: {
      medication: true,
    },
    orderBy: [{ userId: 'asc' }, { medicationId: 'asc' }],
  });
}

module.exports = {
  listDueMedicationReminderCandidates,
};
