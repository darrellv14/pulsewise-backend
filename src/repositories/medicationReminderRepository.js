const prisma = require('../config/prisma');
const {
  toPrismaDate,
  toPrismaTime,
  isDailyMedicationScheduledOnDate,
} = require('../services/medication/shared');

async function listDueMedicationReminderCandidates({ scheduledDate, scheduledTime, dayOfWeek }) {
  const targetDate = toPrismaDate(scheduledDate);
  const targetTime = toPrismaTime(scheduledTime);

  const candidates = await prisma.reminder.findMany({
    where: {
      scheduleTime: targetTime,
      user: {
        fcmDeviceTokens: {
          some: {
            isActive: true,
          },
        },
      },
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

  return candidates.filter((candidate) => {
    if (candidate.medication?.frequency === 'weekly') {
      return true;
    }

    return isDailyMedicationScheduledOnDate({
      medication: candidate.medication,
      scheduledDate,
    });
  });
}

module.exports = {
  listDueMedicationReminderCandidates,
};
