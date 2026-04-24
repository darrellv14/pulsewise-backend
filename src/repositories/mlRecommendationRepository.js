const prisma = require('../config/prisma');

function toDateOnlyDate(value) {
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

function toNullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function buildDiaryWindow({ endDate, windowDays }) {
  const resolvedEndDate = toDateOnlyDate(endDate) || toDateOnlyDate(new Date());
  const startDate = new Date(resolvedEndDate);
  startDate.setUTCDate(startDate.getUTCDate() - Math.max(0, windowDays - 1));

  return {
    startDate,
    endDate: resolvedEndDate,
  };
}

function mapSleepRecord(row) {
  if (!row) {
    return null;
  }

  return {
    sleepRecordId: row.sleepRecordId,
    diaryId: row.diaryId,
    sleepTime: row.sleepTime,
    wakeTime: row.wakeTime,
    sleepDurationHours: toNullableNumber(row.sleepDurationHours),
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSnapshot(snapshot, window) {
  if (!snapshot) {
    return null;
  }

  return {
    user: {
      userId: snapshot.userId,
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      email: snapshot.email,
      address: snapshot.address,
      telNo: snapshot.telNo,
    },
    patientProfile: snapshot.patientProfile
      ? {
          patientId: snapshot.patientProfile.patientId,
          dateOfBirth: snapshot.patientProfile.dateOfBirth,
          sex: snapshot.patientProfile.sex,
          bodyHeightCm:
            snapshot.patientProfile.bodyHeightCm !== null &&
            snapshot.patientProfile.bodyHeightCm !== undefined
              ? Number(snapshot.patientProfile.bodyHeightCm)
              : null,
          isSmoking: snapshot.patientProfile.isSmoking,
          isElectricSmoking: snapshot.patientProfile.isElectricSmoking,
          bloodType: snapshot.patientProfile.bloodType,
        }
      : null,
    patientMlProfile: snapshot.patientMlProfile
      ? {
          patientId: snapshot.patientMlProfile.patientId,
          demog1_riagendr: snapshot.patientMlProfile.demog1Riagendr,
          demog1_ridreth3: snapshot.patientMlProfile.demog1Ridreth3,
          demog1_dmdeduc: snapshot.patientMlProfile.demog1Dmdeduc,
          demog1_dmdfmsiz: snapshot.patientMlProfile.demog1Dmdfmsiz,
          demog1_dmdhhsiz: snapshot.patientMlProfile.demog1Dmdhhsiz,
          demog1_dmdhhsza: snapshot.patientMlProfile.demog1Dmdhhsza,
          demog1_dmdhhszb: snapshot.patientMlProfile.demog1Dmdhhszb,
          demog1_dmdhhsze: snapshot.patientMlProfile.demog1Dmdhhsze,
          demog1_dmdmartl: snapshot.patientMlProfile.demog1Dmdmartl,
          quest22_smq020: snapshot.patientMlProfile.quest22Smq020,
          quest22_smq890: snapshot.patientMlProfile.quest22Smq890,
          quest22_smq900: snapshot.patientMlProfile.quest22Smq900,
          quest23_smd470: snapshot.patientMlProfile.quest23Smd470,
          quest1_alq111: snapshot.patientMlProfile.quest1Alq111,
          createdAt: snapshot.patientMlProfile.createdAt,
          updatedAt: snapshot.patientMlProfile.updatedAt,
        }
      : null,
    latestAssessment: snapshot.patientMlAssessments?.[0]
      ? {
          assessmentId: snapshot.patientMlAssessments[0].assessmentId,
          patientId: snapshot.patientMlAssessments[0].patientId,
          assessmentDate: snapshot.patientMlAssessments[0].assessmentDate,
          exami1_bpxpls: snapshot.patientMlAssessments[0].exami1Bpxpls,
          labor1_lbdtcsi: toNullableNumber(snapshot.patientMlAssessments[0].labor1Lbdtcsi),
          labor2_urdflow1: toNullableNumber(snapshot.patientMlAssessments[0].labor2Urdflow1),
          labor2_urdtime1: toNullableNumber(snapshot.patientMlAssessments[0].labor2Urdtime1),
          labor2_urxvol1: toNullableNumber(snapshot.patientMlAssessments[0].labor2Urxvol1),
          quest11_hiq011: snapshot.patientMlAssessments[0].quest11Hiq011,
          quest12_heq010: snapshot.patientMlAssessments[0].quest12Heq010,
          quest12_heq030: snapshot.patientMlAssessments[0].quest12Heq030,
          quest15_kiq022: snapshot.patientMlAssessments[0].quest15Kiq022,
          quest15_kiq026: snapshot.patientMlAssessments[0].quest15Kiq026,
          quest16_mcq010: snapshot.patientMlAssessments[0].quest16Mcq010,
          quest16_mcq160b: snapshot.patientMlAssessments[0].quest16Mcq160b,
          quest16_mcq220: snapshot.patientMlAssessments[0].quest16Mcq220,
          quest16_mcq300a: snapshot.patientMlAssessments[0].quest16Mcq300a,
          quest16_mcq300c: snapshot.patientMlAssessments[0].quest16Mcq300c,
          quest17_dpq020: snapshot.patientMlAssessments[0].quest17Dpq020,
          quest17_dpq030: snapshot.patientMlAssessments[0].quest17Dpq030,
          quest17_dpq040: snapshot.patientMlAssessments[0].quest17Dpq040,
          quest20_pfq061b: snapshot.patientMlAssessments[0].quest20Pfq061b,
          quest20_pfq061c: snapshot.patientMlAssessments[0].quest20Pfq061c,
          quest20_pfq061h: snapshot.patientMlAssessments[0].quest20Pfq061h,
          quest3_cdq009: snapshot.patientMlAssessments[0].quest3Cdq009,
          quest3_cdq010: snapshot.patientMlAssessments[0].quest3Cdq010,
          quest7_diq010: snapshot.patientMlAssessments[0].quest7Diq010,
          quest9_dlq050: snapshot.patientMlAssessments[0].quest9Dlq050,
          createdAt: snapshot.patientMlAssessments[0].createdAt,
          updatedAt: snapshot.patientMlAssessments[0].updatedAt,
        }
      : null,
    diaries: (snapshot.heartDiaries || []).map((diary) => ({
      diaryId: diary.diaryId,
      diaryDate: diary.diaryDate,
      sleepRecord: mapSleepRecord(diary.sleepRecord),
      bodyMetrics: (diary.bodyMetrics || []).map((metric) => ({
        metricId: metric.metricId,
        bodyHeight: metric.bodyHeight !== null ? Number(metric.bodyHeight) : null,
        bodyWeight: metric.bodyWeight !== null ? Number(metric.bodyWeight) : null,
        bmi: metric.bmi !== null ? Number(metric.bmi) : null,
        systolicPressure: metric.systolicPressure,
        diastolicPressure: metric.diastolicPressure,
        heartRate: metric.heartRate,
        timeStamp: metric.timeStamp,
      })),
      symptoms: (diary.symptoms || []).map((symptom) => ({
        symptomId: symptom.symptomId,
        symptomName: symptom.symptomName,
        symptomCode: symptom.symptomCode,
        bodyArea: symptom.bodyArea,
        isChestPain: symptom.isChestPain,
        painFrequencyCode: symptom.painFrequencyCode,
        painLocationCode: symptom.painLocationCode,
        intensity: symptom.intensity,
        note: symptom.note,
        timeStamp: symptom.timeStamp,
      })),
      activities: (diary.activities || []).map((activity) => ({
        activityId: activity.activityId,
        name: activity.name,
        activityCategory: activity.activityCategory,
        intensityLevel: activity.intensityLevel,
        transportMode: activity.transportMode,
        outdoorMinutes: activity.outdoorMinutes,
        duration: activity.duration,
        heartRate: activity.heartRate,
        userFeeling: activity.userFeeling,
        note: activity.note,
        timeStamp: activity.timeStamp,
      })),
      consumptions: (diary.consumptions || []).map((consumption) => ({
        consumptionId: consumption.consumptionId,
        type: consumption.type,
        name: consumption.name,
        portion: consumption.portion,
        portionGrams: consumption.portionGrams !== null ? Number(consumption.portionGrams) : null,
        fdcFoodId: consumption.fdcFoodId,
        nutritionSource: consumption.nutritionSource,
        energyKcal: toNullableNumber(consumption.energyKcal),
        proteinG: toNullableNumber(consumption.proteinG),
        carbohydrateG: toNullableNumber(consumption.carbohydrateG),
        sugarG: toNullableNumber(consumption.sugarG),
        fiberG: toNullableNumber(consumption.fiberG),
        totalFatG: toNullableNumber(consumption.totalFatG),
        saturatedFatG: toNullableNumber(consumption.saturatedFatG),
        monounsaturatedFatG: toNullableNumber(consumption.monounsaturatedFatG),
        polyunsaturatedFatG: toNullableNumber(consumption.polyunsaturatedFatG),
        cholesterolMg: toNullableNumber(consumption.cholesterolMg),
        calciumMg: toNullableNumber(consumption.calciumMg),
        note: consumption.note,
        timeStamp: consumption.timeStamp,
      })),
    })),
    vitalSignReadings: (snapshot.vitalSignReadings || []).map((reading) => ({
      readingId: String(reading.readingId),
      source: reading.source,
      metricType: reading.metricType,
      valueNumeric: toNullableNumber(reading.valueNumeric),
      unit: reading.unit,
      measuredAt: reading.measuredAt,
    })),
    window: {
      startDate: window.startDate.toISOString().slice(0, 10),
      endDate: window.endDate.toISOString().slice(0, 10),
    },
  };
}

async function getPatientMlSnapshot({ userId, endDate = null, windowDays = 7 }) {
  const window = buildDiaryWindow({ endDate, windowDays });

  const snapshot = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      email: true,
      address: true,
      telNo: true,
      patientProfile: {
        select: {
          patientId: true,
          dateOfBirth: true,
          sex: true,
          bodyHeightCm: true,
          isSmoking: true,
          isElectricSmoking: true,
          bloodType: true,
        },
      },
      patientMlProfile: {
        select: {
          patientId: true,
          demog1Riagendr: true,
          demog1Ridreth3: true,
          demog1Dmdeduc: true,
          demog1Dmdfmsiz: true,
          demog1Dmdhhsiz: true,
          demog1Dmdhhsza: true,
          demog1Dmdhhszb: true,
          demog1Dmdhhsze: true,
          demog1Dmdmartl: true,
          quest22Smq020: true,
          quest22Smq890: true,
          quest22Smq900: true,
          quest23Smd470: true,
          quest1Alq111: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      patientMlAssessments: {
        orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
        take: 1,
        select: {
          assessmentId: true,
          patientId: true,
          assessmentDate: true,
          exami1Bpxpls: true,
          labor1Lbdtcsi: true,
          labor2Urdflow1: true,
          labor2Urdtime1: true,
          labor2Urxvol1: true,
          quest11Hiq011: true,
          quest12Heq010: true,
          quest12Heq030: true,
          quest15Kiq022: true,
          quest15Kiq026: true,
          quest16Mcq010: true,
          quest16Mcq160b: true,
          quest16Mcq220: true,
          quest16Mcq300a: true,
          quest16Mcq300c: true,
          quest17Dpq020: true,
          quest17Dpq030: true,
          quest17Dpq040: true,
          quest20Pfq061b: true,
          quest20Pfq061c: true,
          quest20Pfq061h: true,
          quest3Cdq009: true,
          quest3Cdq010: true,
          quest7Diq010: true,
          quest9Dlq050: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      heartDiaries: {
        where: {
          diaryDate: {
            gte: window.startDate,
            lte: window.endDate,
          },
        },
        orderBy: {
          diaryDate: 'asc',
        },
        select: {
          diaryId: true,
          diaryDate: true,
          sleepRecord: {
            select: {
              sleepRecordId: true,
              diaryId: true,
              sleepTime: true,
              wakeTime: true,
              sleepDurationHours: true,
              source: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          bodyMetrics: {
            orderBy: {
              timeStamp: 'desc',
            },
            select: {
              metricId: true,
              bodyHeight: true,
              bodyWeight: true,
              bmi: true,
              systolicPressure: true,
              diastolicPressure: true,
              heartRate: true,
              timeStamp: true,
            },
          },
          symptoms: {
            orderBy: {
              timeStamp: 'desc',
            },
            select: {
              symptomId: true,
              symptomName: true,
              symptomCode: true,
              bodyArea: true,
              isChestPain: true,
              painFrequencyCode: true,
              painLocationCode: true,
              intensity: true,
              note: true,
              timeStamp: true,
            },
          },
          activities: {
            orderBy: {
              timeStamp: 'desc',
            },
            select: {
              activityId: true,
              name: true,
              activityCategory: true,
              intensityLevel: true,
              transportMode: true,
              outdoorMinutes: true,
              duration: true,
              heartRate: true,
              userFeeling: true,
              note: true,
              timeStamp: true,
            },
          },
          consumptions: {
            orderBy: {
              timeStamp: 'desc',
            },
            select: {
              consumptionId: true,
              type: true,
              name: true,
              portion: true,
              portionGrams: true,
              fdcFoodId: true,
              nutritionSource: true,
              energyKcal: true,
              proteinG: true,
              carbohydrateG: true,
              sugarG: true,
              fiberG: true,
              totalFatG: true,
              saturatedFatG: true,
              monounsaturatedFatG: true,
              polyunsaturatedFatG: true,
              cholesterolMg: true,
              calciumMg: true,
              note: true,
              timeStamp: true,
            },
          },
        },
      },
      vitalSignReadings: {
        where: {
          measuredAt: {
            gte: window.startDate,
            lte: new Date(`${window.endDate.toISOString().slice(0, 10)}T23:59:59.999Z`),
          },
        },
        orderBy: {
          measuredAt: 'desc',
        },
        select: {
          readingId: true,
          source: true,
          metricType: true,
          valueNumeric: true,
          unit: true,
          measuredAt: true,
        },
      },
    },
  });

  return mapSnapshot(snapshot, window);
}

module.exports = {
  getPatientMlSnapshot,
};
