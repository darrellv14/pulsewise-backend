const { normalizeMetricType } = require('./metricTypes');

const ML_V3_LIFESTYLE_FIELDS = [
  'Dieta1_DR1TCALC',
  'Dieta1_DR1TCARB',
  'Dieta1_DR1TCHOL',
  'Dieta1_DR1TFIBE',
  'Dieta1_DR1TKCAL',
  'Dieta1_DR1TMFAT',
  'Dieta1_DR1TPFAT',
  'Dieta1_DR1TPROT',
  'Dieta1_DR1TSFAT',
  'Dieta1_DR1TSUGR',
  'Dieta1_DR1TTFAT',
  'Exami2_BMXBMI',
  'Quest19_PAD615',
  'Quest19_PAD645',
  'Quest19_PAD660',
  'Quest19_PAQ610',
  'Quest19_PAQ635',
  'Quest19_PAQ640',
  'Quest19_PAQ655',
  'Quest21_SLD123',
  'Quest21_SLQ3032',
  'Quest6_DED1225',
];

const ML_V3_CHARACTERISTIC_FIELDS = [
  'Demog1_DMDEDUC',
  'Demog1_DMDFMSIZ',
  'Demog1_DMDHHSIZ',
  'Demog1_DMDHHSZA',
  'Demog1_DMDHHSZB',
  'Demog1_DMDHHSZE',
  'Demog1_DMDMARTL',
  'Demog1_RIAGENDR',
  'Demog1_RIDAGEYR',
  'Demog1_RIDRETH3',
  'Exami1_BPXPLS',
  'Exami1_DiaPulse',
  'Exami1_SysPulse',
  'Exami2_BMXHT',
  'Exami2_BMXWT',
  'Labor1_LBDTCSI',
  'Labor2_URDFLOW1',
  'Labor2_URDTIME1',
  'Labor2_URXVOL1',
  'Quest11_HIQ011',
  'Quest12_HEQ010',
  'Quest12_HEQ030',
  'Quest15_KIQ022',
  'Quest15_KIQ026',
  'Quest16_MCQ010',
  'Quest16_MCQ220',
  'Quest16_MCQ300A',
  'Quest16_MCQ300C',
  'Quest17_DPQ020',
  'Quest17_DPQ030',
  'Quest17_DPQ040',
  'Quest1_ALQ111',
  'Quest20_PFQ061B',
  'Quest20_PFQ061C',
  'Quest20_PFQ061H',
  'Quest22_SMQ020',
  'Quest22_SMQ890',
  'Quest22_SMQ900',
  'Quest23_SMD470',
  'Quest3_CDQ008',
  'Quest3_CDQ009',
  'Quest3_CDQ010',
  'Quest7_DIQ010',
  'Quest9_DLQ050',
  'Quest16_MCQ160B',
];

const ML_V3_ALL_FIELDS = [...ML_V3_LIFESTYLE_FIELDS, ...ML_V3_CHARACTERISTIC_FIELDS];

const NUTRIENT_FIELD_MAP = {
  Dieta1_DR1TKCAL: 'energyKcal',
  Dieta1_DR1TPROT: 'proteinG',
  Dieta1_DR1TCARB: 'carbohydrateG',
  Dieta1_DR1TSUGR: 'sugarG',
  Dieta1_DR1TFIBE: 'fiberG',
  Dieta1_DR1TTFAT: 'totalFatG',
  Dieta1_DR1TSFAT: 'saturatedFatG',
  Dieta1_DR1TMFAT: 'monounsaturatedFatG',
  Dieta1_DR1TPFAT: 'polyunsaturatedFatG',
  Dieta1_DR1TCHOL: 'cholesterolMg',
  Dieta1_DR1TCALC: 'calciumMg',
};

const BIOMETRIC_ALIASES = {
  Exami2_BMXHT: ['height'],
  Exami2_BMXWT: ['weight'],
  Exami2_BMXBMI: ['bmi'],
  Exami1_SysPulse: ['systolic_bp', 'systolic_pressure', 'systolic'],
  Exami1_DiaPulse: ['diastolic_bp', 'diastolic_pressure', 'diastolic'],
  Exami1_BPXPLS: ['pulse_regularity_code'],
  Labor1_LBDTCSI: ['total_cholesterol'],
  Labor2_URDFLOW1: ['urine_flow_rate'],
  Labor2_URDTIME1: ['urination_time'],
  Labor2_URXVOL1: ['urine_volume'],
};

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateOnlyIso(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function calculateAge(dateOfBirth) {
  const iso = toDateOnlyIso(dateOfBirth);
  if (!iso) {
    return null;
  }

  const dob = new Date(`${iso}T00:00:00.000Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();

  if (
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function parseTimeToMinutes(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getUTCHours() * 60 + parsed.getUTCMinutes();
  }

  const match = String(value)
    .trim()
    .match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function calculateSleepDurationHours(sleepTime, wakeTime) {
  const sleepMinutes = parseTimeToMinutes(sleepTime);
  const wakeMinutes = parseTimeToMinutes(wakeTime);

  if (sleepMinutes === null || wakeMinutes === null) {
    return null;
  }

  const adjustedWakeMinutes = wakeMinutes >= sleepMinutes ? wakeMinutes : wakeMinutes + 1440;
  return (adjustedWakeMinutes - sleepMinutes) / 60;
}

function calculateBmi(weightKg, heightCm) {
  const weight = toFiniteNumber(weightKg);
  const height = toFiniteNumber(heightCm);

  if (weight === null || height === null || height <= 0) {
    return null;
  }

  const heightMeters = height / 100;
  if (heightMeters <= 0) {
    return null;
  }

  const bmi = weight / (heightMeters * heightMeters);
  return Number.isFinite(bmi) ? Number(bmi.toFixed(2)) : null;
}

function flattenDiaries(diaries = []) {
  const bodyMetrics = [];
  const symptoms = [];
  const activities = [];
  const consumptions = [];
  const sleepRecords = [];

  for (const diary of diaries) {
    const diaryDate = toDateOnlyIso(diary.diaryDate);

    for (const metric of diary.bodyMetrics || []) {
      bodyMetrics.push({ ...metric, diaryDate });
    }
    for (const symptom of diary.symptoms || []) {
      symptoms.push({ ...symptom, diaryDate });
    }
    for (const activity of diary.activities || []) {
      activities.push({ ...activity, diaryDate });
    }
    for (const consumption of diary.consumptions || []) {
      consumptions.push({ ...consumption, diaryDate });
    }
    if (diary.sleepRecord) {
      sleepRecords.push({
        ...diary.sleepRecord,
        diaryDate,
      });
    }
  }

  return {
    bodyMetrics,
    symptoms,
    activities,
    consumptions,
    sleepRecords,
  };
}

function pickLatestByTimestamp(rows = [], ...candidates) {
  return [...rows]
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = new Date(left.timeStamp || left.measuredAt || left.diaryDate || 0).getTime();
      const rightTime = new Date(
        right.timeStamp || right.measuredAt || right.diaryDate || 0
      ).getTime();
      return rightTime - leftTime;
    })
    .find((row) =>
      candidates.some((candidate) => toFiniteNumber(row[candidate]) !== null || row[candidate] !== null)
    );
}

function pickLatestBiometric(readings = [], aliases = []) {
  return readings.find((reading) => aliases.includes(normalizeMetricType(reading.metricType)));
}

function resolveBodyMetricValue({ latestBodyMetric, patientProfile, vitalSignReadings }, field) {
  const candidates = {
    Exami2_BMXHT: latestBodyMetric?.bodyHeight ?? patientProfile?.bodyHeightCm,
    Exami2_BMXWT: latestBodyMetric?.bodyWeight,
    Exami2_BMXBMI: latestBodyMetric?.bmi,
    Exami1_SysPulse: latestBodyMetric?.systolicPressure,
    Exami1_DiaPulse: latestBodyMetric?.diastolicPressure,
  };

  const directValue = toFiniteNumber(candidates[field]);
  if (directValue !== null) {
    return {
      value: directValue,
      source:
        field === 'Exami2_BMXHT' &&
        toFiniteNumber(latestBodyMetric?.bodyHeight) === null &&
        toFiniteNumber(patientProfile?.bodyHeightCm) !== null
          ? 'patient_profile'
          : 'daily_body_metric',
    };
  }

  if (field === 'Exami2_BMXBMI') {
    const derivedBmi = calculateBmi(
      latestBodyMetric?.bodyWeight,
      latestBodyMetric?.bodyHeight ?? patientProfile?.bodyHeightCm
    );

    if (derivedBmi !== null) {
      return {
        value: derivedBmi,
        source:
          toFiniteNumber(latestBodyMetric?.bodyHeight) !== null
            ? 'daily_body_metric_derived_bmi'
            : 'patient_profile_height_derived_bmi',
      };
    }
  }

  const reading = pickLatestBiometric(vitalSignReadings, BIOMETRIC_ALIASES[field] || []);
  if (!reading) {
    return null;
  }

  const numericValue = toFiniteNumber(reading.valueNumeric);
  if (numericValue === null) {
    return null;
  }

  return {
    value: numericValue,
    source: 'vital_sign_reading',
  };
}

function buildDietAverage(consumptions = []) {
  const dayTotals = new Map();

  for (const item of consumptions) {
    const dayKey = item.diaryDate;
    if (!dayKey) {
      continue;
    }

    const nutrientValues = Object.values(NUTRIENT_FIELD_MAP).map((key) => toFiniteNumber(item[key]));
    if (!nutrientValues.some((value) => value !== null)) {
      continue;
    }

    const existing =
      dayTotals.get(dayKey) ||
      Object.fromEntries(Object.values(NUTRIENT_FIELD_MAP).map((key) => [key, 0]));

    for (const key of Object.values(NUTRIENT_FIELD_MAP)) {
      existing[key] += toFiniteNumber(item[key]) || 0;
    }

    dayTotals.set(dayKey, existing);
  }

  if (!dayTotals.size) {
    return null;
  }

  const averaged = Object.fromEntries(Object.values(NUTRIENT_FIELD_MAP).map((key) => [key, 0]));

  for (const totals of dayTotals.values()) {
    for (const key of Object.keys(averaged)) {
      averaged[key] += totals[key];
    }
  }

  for (const key of Object.keys(averaged)) {
    averaged[key] = averaged[key] / dayTotals.size;
  }

  return {
    values: averaged,
    daysWithNutrition: dayTotals.size,
  };
}

function summarizeActivities(activities = []) {
  const summary = {
    workVigorousMinutes: 0,
    workVigorousDays: new Set(),
    transportMinutes: 0,
    transportDays: new Set(),
    recreationVigorousMinutes: 0,
    recreationVigorousDays: new Set(),
    outdoorMinutes: 0,
    outdoorMinutesKnown: false,
  };

  for (const activity of activities) {
    const diaryDate = activity.diaryDate;
    const duration = toFiniteNumber(activity.duration) || 0;
    const outdoorMinutes = toFiniteNumber(activity.outdoorMinutes);
    const category = String(activity.activityCategory || '')
      .trim()
      .toLowerCase();
    const intensity = String(activity.intensityLevel || '')
      .trim()
      .toLowerCase();
    const transportMode = String(activity.transportMode || '')
      .trim()
      .toLowerCase();

    if (outdoorMinutes !== null) {
      summary.outdoorMinutes += outdoorMinutes;
      summary.outdoorMinutesKnown = true;
    }

    if (category === 'work' && intensity === 'vigorous') {
      summary.workVigorousMinutes += duration;
      if (diaryDate) {
        summary.workVigorousDays.add(diaryDate);
      }
    }

    if (category === 'transport' && ['walk', 'bicycle'].includes(transportMode)) {
      summary.transportMinutes += duration;
      if (diaryDate) {
        summary.transportDays.add(diaryDate);
      }
    }

    if (category === 'recreation' && intensity === 'vigorous') {
      summary.recreationVigorousMinutes += duration;
      if (diaryDate) {
        summary.recreationVigorousDays.add(diaryDate);
      }
    }
  }

  return summary;
}

function hasStructuredChestPain(symptoms = []) {
  return symptoms.some(
    (symptom) =>
      symptom.isChestPain === true ||
      String(symptom.symptomCode || '')
        .trim()
        .toLowerCase() === 'chest_pain'
  );
}

function createBuildState(snapshot = {}) {
  return {
    payload: {},
    resolvedFieldSet: new Set(),
    missingFieldSet: new Set(),
    fieldSources: {},
    snapshot,
  };
}

function setResolved(state, field, value, source) {
  const numericValue = toFiniteNumber(value);
  if (numericValue === null) {
    return;
  }

  state.payload[field] = numericValue;
  state.resolvedFieldSet.add(field);
  state.fieldSources[field] = source;
}

function markMissingIfUnresolved(state, field) {
  if (!state.resolvedFieldSet.has(field)) {
    state.missingFieldSet.add(field);
  }
}

function buildMlV3Payload(snapshot = {}) {
  const state = createBuildState(snapshot);
  const flattened = flattenDiaries(snapshot.diaries || []);
  const patientProfile = snapshot.patientProfile || {};
  const patientMlProfile = snapshot.patientMlProfile || {};
  const latestAssessment = snapshot.latestAssessment || {};
  const latestBodyMetric = pickLatestByTimestamp(flattened.bodyMetrics, 'bodyHeight', 'bodyWeight');
  const latestSleepRecord = pickLatestByTimestamp(flattened.sleepRecords, 'sleepDurationHours');
  const dietAverage = buildDietAverage(flattened.consumptions);
  const activitySummary = summarizeActivities(flattened.activities);
  const diaryDays = (snapshot.diaries || []).length;

  setResolved(state, 'Demog1_RIDAGEYR', calculateAge(patientProfile.dateOfBirth), 'patient_profile');
  setResolved(state, 'Demog1_RIAGENDR', patientMlProfile.demog1_riagendr, 'patient_ml_profile');
  setResolved(state, 'Demog1_RIDRETH3', patientMlProfile.demog1_ridreth3, 'patient_ml_profile');
  setResolved(state, 'Demog1_DMDEDUC', patientMlProfile.demog1_dmdeduc, 'patient_ml_profile');
  setResolved(state, 'Demog1_DMDFMSIZ', patientMlProfile.demog1_dmdfmsiz, 'patient_ml_profile');
  setResolved(state, 'Demog1_DMDHHSIZ', patientMlProfile.demog1_dmdhhsiz, 'patient_ml_profile');
  setResolved(state, 'Demog1_DMDHHSZA', patientMlProfile.demog1_dmdhhsza, 'patient_ml_profile');
  setResolved(state, 'Demog1_DMDHHSZB', patientMlProfile.demog1_dmdhhszb, 'patient_ml_profile');
  setResolved(state, 'Demog1_DMDHHSZE', patientMlProfile.demog1_dmdhhsze, 'patient_ml_profile');
  setResolved(state, 'Demog1_DMDMARTL', patientMlProfile.demog1_dmdmartl, 'patient_ml_profile');
  setResolved(state, 'Quest22_SMQ020', patientMlProfile.quest22_smq020, 'patient_ml_profile');
  setResolved(state, 'Quest22_SMQ890', patientMlProfile.quest22_smq890, 'patient_ml_profile');
  setResolved(state, 'Quest22_SMQ900', patientMlProfile.quest22_smq900, 'patient_ml_profile');
  setResolved(state, 'Quest23_SMD470', patientMlProfile.quest23_smd470, 'patient_ml_profile');
  setResolved(state, 'Quest1_ALQ111', patientMlProfile.quest1_alq111, 'patient_ml_profile');

  setResolved(state, 'Quest11_HIQ011', latestAssessment.quest11_hiq011, 'patient_ml_assessment');
  setResolved(state, 'Quest12_HEQ010', latestAssessment.quest12_heq010, 'patient_ml_assessment');
  setResolved(state, 'Quest12_HEQ030', latestAssessment.quest12_heq030, 'patient_ml_assessment');
  setResolved(state, 'Quest15_KIQ022', latestAssessment.quest15_kiq022, 'patient_ml_assessment');
  setResolved(state, 'Quest15_KIQ026', latestAssessment.quest15_kiq026, 'patient_ml_assessment');
  setResolved(state, 'Quest16_MCQ010', latestAssessment.quest16_mcq010, 'patient_ml_assessment');
  setResolved(state, 'Quest16_MCQ160B', latestAssessment.quest16_mcq160b, 'patient_ml_assessment');
  setResolved(state, 'Quest16_MCQ220', latestAssessment.quest16_mcq220, 'patient_ml_assessment');
  setResolved(state, 'Quest16_MCQ300A', latestAssessment.quest16_mcq300a, 'patient_ml_assessment');
  setResolved(state, 'Quest16_MCQ300C', latestAssessment.quest16_mcq300c, 'patient_ml_assessment');
  setResolved(state, 'Quest17_DPQ020', latestAssessment.quest17_dpq020, 'patient_ml_assessment');
  setResolved(state, 'Quest17_DPQ030', latestAssessment.quest17_dpq030, 'patient_ml_assessment');
  setResolved(state, 'Quest17_DPQ040', latestAssessment.quest17_dpq040, 'patient_ml_assessment');
  setResolved(state, 'Quest20_PFQ061B', latestAssessment.quest20_pfq061b, 'patient_ml_assessment');
  setResolved(state, 'Quest20_PFQ061C', latestAssessment.quest20_pfq061c, 'patient_ml_assessment');
  setResolved(state, 'Quest20_PFQ061H', latestAssessment.quest20_pfq061h, 'patient_ml_assessment');
  setResolved(state, 'Quest3_CDQ009', latestAssessment.quest3_cdq009, 'patient_ml_assessment');
  setResolved(state, 'Quest3_CDQ010', latestAssessment.quest3_cdq010, 'patient_ml_assessment');
  setResolved(state, 'Quest7_DIQ010', latestAssessment.quest7_diq010, 'patient_ml_assessment');
  setResolved(state, 'Quest9_DLQ050', latestAssessment.quest9_dlq050, 'patient_ml_assessment');

  for (const field of [
    'Exami2_BMXHT',
    'Exami2_BMXWT',
    'Exami2_BMXBMI',
    'Exami1_SysPulse',
    'Exami1_DiaPulse',
  ]) {
    const resolved = resolveBodyMetricValue({
      latestBodyMetric,
      patientProfile,
      vitalSignReadings: snapshot.vitalSignReadings || [],
    }, field);

    if (resolved) {
      setResolved(state, field, resolved.value, resolved.source);
    }
  }

  setResolved(state, 'Exami1_BPXPLS', latestAssessment.exami1_bpxpls, 'patient_ml_assessment');
  setResolved(state, 'Labor1_LBDTCSI', latestAssessment.labor1_lbdtcsi, 'patient_ml_assessment');
  setResolved(state, 'Labor2_URDFLOW1', latestAssessment.labor2_urdflow1, 'patient_ml_assessment');
  setResolved(state, 'Labor2_URDTIME1', latestAssessment.labor2_urdtime1, 'patient_ml_assessment');
  setResolved(state, 'Labor2_URXVOL1', latestAssessment.labor2_urxvol1, 'patient_ml_assessment');

  for (const field of [
    'Exami1_BPXPLS',
    'Labor1_LBDTCSI',
    'Labor2_URDFLOW1',
    'Labor2_URDTIME1',
    'Labor2_URXVOL1',
  ]) {
    if (state.resolvedFieldSet.has(field)) {
      continue;
    }

    const reading = pickLatestBiometric(snapshot.vitalSignReadings || [], BIOMETRIC_ALIASES[field] || []);
    if (reading) {
      setResolved(state, field, reading.valueNumeric, 'vital_sign_reading');
    }
  }

  if (latestSleepRecord) {
    setResolved(state, 'Quest21_SLQ3032', parseTimeToMinutes(latestSleepRecord.sleepTime), 'daily_sleep_record');
    setResolved(
      state,
      'Quest21_SLD123',
      latestSleepRecord.sleepDurationHours ??
        calculateSleepDurationHours(latestSleepRecord.sleepTime, latestSleepRecord.wakeTime),
      'daily_sleep_record'
    );
  }

  if (dietAverage) {
    for (const [field, nutrientKey] of Object.entries(NUTRIENT_FIELD_MAP)) {
      setResolved(state, field, dietAverage.values[nutrientKey], 'daily_consumption_nutrition_snapshot');
    }
  }

  if (flattened.activities.length) {
    setResolved(state, 'Quest19_PAD615', activitySummary.workVigorousMinutes, 'daily_activity');
    setResolved(state, 'Quest19_PAQ610', activitySummary.workVigorousDays.size, 'daily_activity');
    setResolved(state, 'Quest19_PAD645', activitySummary.transportMinutes, 'daily_activity');
    setResolved(
      state,
      'Quest19_PAQ635',
      activitySummary.transportDays.size > 0 ? 1 : 0,
      'daily_activity'
    );
    setResolved(state, 'Quest19_PAQ640', activitySummary.transportDays.size, 'daily_activity');
    setResolved(
      state,
      'Quest19_PAD660',
      activitySummary.recreationVigorousMinutes,
      'daily_activity'
    );
    setResolved(
      state,
      'Quest19_PAQ655',
      activitySummary.recreationVigorousDays.size,
      'daily_activity'
    );

    if (activitySummary.outdoorMinutesKnown) {
      setResolved(state, 'Quest6_DED1225', activitySummary.outdoorMinutes, 'daily_activity');
    }
  }

  if (diaryDays > 0) {
    setResolved(
      state,
      'Quest3_CDQ008',
      hasStructuredChestPain(flattened.symptoms) ? 1 : 0,
      'daily_symptom'
    );
  }

  for (const field of ML_V3_ALL_FIELDS) {
    markMissingIfUnresolved(state, field);
  }

  return {
    payload: state.payload,
    missingFields: Array.from(state.missingFieldSet).sort(),
    resolvedFields: Array.from(state.resolvedFieldSet).sort(),
    sourceSummary: {
      window: snapshot.window || null,
      diaryDays,
      dietDaysWithSnapshot: dietAverage?.daysWithNutrition || 0,
      latestAssessmentDate: toDateOnlyIso(latestAssessment.assessmentDate),
      latestSleepDiaryDate: latestSleepRecord?.diaryDate || null,
      latestBodyMetricDate: latestBodyMetric?.diaryDate || null,
      biometricFallbackFields: Object.entries(state.fieldSources)
        .filter(([, source]) => source === 'vital_sign_reading')
        .map(([field]) => field)
        .sort(),
    },
  };
}

module.exports = {
  ML_V3_LIFESTYLE_FIELDS,
  ML_V3_CHARACTERISTIC_FIELDS,
  ML_V3_ALL_FIELDS,
  buildMlV3Payload,
  calculateAge,
  calculateSleepDurationHours,
  parseTimeToMinutes,
};
