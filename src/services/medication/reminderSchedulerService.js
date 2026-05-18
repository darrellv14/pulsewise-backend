const env = require('../../config/env');
const medicationReminderRepository = require('../../repositories/medicationReminderRepository');
const pushNotificationLogRepository = require('../../repositories/pushNotificationLogRepository');
const {
  buildMedicationReminderDedupeKey,
  sendMedicationReminderNotificationInternal,
} = require('./reminderNotificationService');

let schedulerHandle = null;
let isRunning = false;

const WEEKDAY_TO_MONDAY_INDEX = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function getZonedSlotParts(dateValue, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(dateValue);
  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    scheduledDate: `${mapped.year}-${mapped.month}-${mapped.day}`,
    scheduledTime: `${mapped.hour}:${mapped.minute}`,
    dayOfWeek: WEEKDAY_TO_MONDAY_INDEX[mapped.weekday],
  };
}

function addMinutes(dateValue, minutes) {
  return new Date(dateValue.getTime() + minutes * 60 * 1000);
}

function buildSchedulerSlots(now, lookbackMinutes, timeZone = env.schedulers.timeZone) {
  const slots = [];

  for (let offset = lookbackMinutes - 1; offset >= 0; offset -= 1) {
    const slotTime = addMinutes(now, -offset);
    slots.push({
      at: slotTime,
      ...getZonedSlotParts(slotTime, timeZone),
    });
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
    const { scheduledDate, scheduledTime, dayOfWeek } = slot;
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
    `[SCHEDULER] Medication reminder scheduler started (tick=${env.schedulers.medicationReminderTickMs}ms, lookback=${env.schedulers.medicationReminderLookbackMinutes}m, timezone=${env.schedulers.timeZone})`
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
