const env = require('../../config/env');
const medicationReminderRepository = require('../../repositories/medicationReminderRepository');
const pushNotificationLogRepository = require('../../repositories/pushNotificationLogRepository');
const {
  buildMedicationReminderDedupeKey,
  sendMedicationReminderNotificationInternal,
} = require('./reminderNotificationService');
const { formatTimeValue, toDateOnlyValue, getMondayBasedDayOfWeek } = require('./shared');

let schedulerHandle = null;
let isRunning = false;

function floorToUtcMinute(dateValue) {
  return new Date(
    Date.UTC(
      dateValue.getUTCFullYear(),
      dateValue.getUTCMonth(),
      dateValue.getUTCDate(),
      dateValue.getUTCHours(),
      dateValue.getUTCMinutes(),
      0,
      0
    )
  );
}

function addUtcMinutes(dateValue, minutes) {
  return new Date(dateValue.getTime() + minutes * 60 * 1000);
}

function buildSchedulerSlots(now, lookbackMinutes) {
  const currentMinute = floorToUtcMinute(now);
  const slots = [];

  for (let offset = lookbackMinutes - 1; offset >= 0; offset -= 1) {
    slots.push(addUtcMinutes(currentMinute, -offset));
  }

  return slots;
}

async function processMedicationReminderWindow({ now = new Date(), logger = console } = {}) {
  const lookbackMinutes = env.schedulers.medicationReminderLookbackMinutes;
  const slots = buildSchedulerSlots(now, lookbackMinutes);
  let scheduledCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const slot of slots) {
    const scheduledDate = toDateOnlyValue(slot);
    const scheduledTime = formatTimeValue(slot);
    const dayOfWeek = getMondayBasedDayOfWeek(slot);
    const candidates = await medicationReminderRepository.listDueMedicationReminderCandidates({
      scheduledDate,
      scheduledTime,
      dayOfWeek,
    });

    for (const candidate of candidates) {
      const dedupeKey = buildMedicationReminderDedupeKey({
        userId: candidate.userId,
        medicationId: candidate.medicationId,
        reminderId: candidate.reminderId,
        scheduledDate,
        scheduledTime,
      });
      const existingLog = await pushNotificationLogRepository.findPushNotificationLogByDedupeKey(
        dedupeKey
      );

      if (existingLog) {
        skippedCount += 1;
        continue;
      }

      try {
        await sendMedicationReminderNotificationInternal({
          userId: candidate.userId,
          medication: candidate.medication,
          reminder: candidate,
          payload: {
            scheduledDate,
            scheduledTime,
            status: 'Open',
          },
          dedupeKey,
        });

        scheduledCount += 1;
      } catch (error) {
        failedCount += 1;
        logger.error?.(
          `[SCHEDULER] Medication reminder send failed for user=${candidate.userId} medication=${candidate.medicationId} reminder=${candidate.reminderId}`,
          error
        );
      }
    }
  }

  if (scheduledCount > 0 || skippedCount > 0 || failedCount > 0) {
    logger.info?.(
      `[SCHEDULER] Medication reminder tick processed: sent=${scheduledCount}, skipped=${skippedCount}, failed=${failedCount}`
    );
  }

  return {
    scheduledCount,
    skippedCount,
    failedCount,
    slotCount: slots.length,
  };
}

async function runMedicationReminderTick() {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    await processMedicationReminderWindow();
  } catch (error) {
    console.error('[SCHEDULER] Medication reminder tick failed', error);
  } finally {
    isRunning = false;
  }
}

function startMedicationReminderScheduler() {
  if (env.isTest) {
    return false;
  }

  if (!env.schedulers.enabled || !env.schedulers.medicationReminderEnabled) {
    return false;
  }

  if (schedulerHandle) {
    return true;
  }

  schedulerHandle = setInterval(runMedicationReminderTick, env.schedulers.medicationReminderTickMs);
  if (typeof schedulerHandle.unref === 'function') {
    schedulerHandle.unref();
  }

  runMedicationReminderTick().catch((error) => {
    console.error('[SCHEDULER] Initial medication reminder tick failed', error);
  });
  console.log(
    `[SCHEDULER] Medication reminder scheduler started (tick=${env.schedulers.medicationReminderTickMs}ms, lookback=${env.schedulers.medicationReminderLookbackMinutes}m)`
  );

  return true;
}

function stopMedicationReminderScheduler() {
  if (!schedulerHandle) {
    return false;
  }

  clearInterval(schedulerHandle);
  schedulerHandle = null;
  return true;
}

module.exports = {
  buildSchedulerSlots,
  processMedicationReminderWindow,
  startMedicationReminderScheduler,
  stopMedicationReminderScheduler,
};
