const prisma = require('../../config/prisma');
const { buildPagination, normalizePaginationInput } = require('../../utils/pagination');
const { createHttpError } = require('../../utils/httpError');
const { NOT_FOUND } = require('../../constants/httpStatus');
const { buildMedicationCacheTags, invalidateCacheTags, withOptionalCacheStrategy } = require('./cache');
const {
  assertPatientScope,
  ensureMedicationOwnership,
  assertReminderCompatibleWithMedication,
  toPrismaTime,
  assertNoDuplicateReminderTime,
  toReminderDto,
} = require('./shared');

async function listRemindersByMedication({ actor, userId, medicationId, query }) {
  assertPatientScope({ actor, userId });
  const { page, limit } = normalizePaginationInput(query);
  const skip = (page - 1) * limit;
  const cacheTags = buildMedicationCacheTags({ userId, medicationId });

  await ensureMedicationOwnership(prisma, { medicationId, userId });

  const where = {
    userId,
    medicationId,
  };

  const [reminders, totalItems] = await Promise.all([
    prisma.reminder.findMany(
      withOptionalCacheStrategy(
        {
          where,
          orderBy: [{ dayOfWeek: 'asc' }, { scheduleTime: 'asc' }],
          skip,
          take: limit,
        },
        cacheTags
      )
    ),
    prisma.reminder.count(
      withOptionalCacheStrategy(
        {
          where,
        },
        cacheTags
      )
    ),
  ]);

  return {
    items: reminders.map(toReminderDto),
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

async function createReminder({ actor, userId, medicationId, payload }) {
  assertPatientScope({ actor, userId });

  const reminder = await prisma.$transaction(async (tx) => {
    const medication = await ensureMedicationOwnership(tx, { medicationId, userId });
    const dayOfWeek = payload.dayOfWeek ?? null;

    assertReminderCompatibleWithMedication(medication, dayOfWeek);
    const scheduleTime = toPrismaTime(payload.scheduleTime);
    await assertNoDuplicateReminderTime(tx, {
      userId,
      medicationId,
      scheduleTime,
      dayOfWeek,
    });

    return tx.reminder.create({
      data: {
        userId,
        medicationId,
        scheduleTime,
        dayOfWeek,
      },
    });
  });

  await invalidateCacheTags(buildMedicationCacheTags({ userId, medicationId }));

  return toReminderDto(reminder);
}

async function updateReminder({ actor, userId, reminderId, payload }) {
  assertPatientScope({ actor, userId });

  let invalidationTags = null;
  const reminder = await prisma.$transaction(async (tx) => {
    const currentReminder = await tx.reminder.findFirst({
      where: {
        reminderId,
        userId,
      },
    });

    if (!currentReminder) {
      throw createHttpError('Reminder tidak ditemukan', NOT_FOUND);
    }

    invalidationTags = buildMedicationCacheTags({
      userId,
      medicationId: currentReminder.medicationId,
    });

    const medication = await ensureMedicationOwnership(tx, {
      medicationId: currentReminder.medicationId,
      userId,
    });
    const dayOfWeek =
      payload.dayOfWeek !== undefined ? payload.dayOfWeek : currentReminder.dayOfWeek;

    assertReminderCompatibleWithMedication(medication, dayOfWeek);
    const scheduleTime = toPrismaTime(payload.scheduleTime);
    await assertNoDuplicateReminderTime(tx, {
      userId,
      medicationId: currentReminder.medicationId,
      scheduleTime,
      dayOfWeek,
      excludeReminderId: reminderId,
    });

    return tx.reminder.update({
      where: {
        reminderId,
      },
      data: {
        scheduleTime,
        dayOfWeek,
      },
    });
  });

  await invalidateCacheTags(invalidationTags);

  return toReminderDto(reminder);
}

async function deleteReminder({ actor, userId, reminderId }) {
  assertPatientScope({ actor, userId });

  const reminder = await prisma.reminder.findFirst({
    where: {
      reminderId,
      userId,
    },
  });

  if (!reminder) {
    throw createHttpError('Reminder tidak ditemukan', NOT_FOUND);
  }

  const result = await prisma.reminder.deleteMany({
    where: {
      reminderId,
      userId,
    },
  });

  if (result.count === 0) {
    throw createHttpError('Reminder tidak ditemukan', NOT_FOUND);
  }

  await invalidateCacheTags(
    buildMedicationCacheTags({
      userId,
      medicationId: reminder.medicationId,
    })
  );

  return {
    reminderId,
  };
}

module.exports = {
  listRemindersByMedication,
  createReminder,
  updateReminder,
  deleteReminder,
};
