const { buildMlV3Payload, ML_V3_ALL_FIELDS } = require('../src/utils/mlPayloadMapper');

describe('mlPayloadMapper.buildMlV3Payload', () => {
  test('returns a fully resolved HFMS v3 payload when all required sources are present', () => {
    const result = buildMlV3Payload({
      patientProfile: {
        dateOfBirth: '2000-04-10',
      },
      patientMlProfile: {
        demog1_riagendr: 1,
        demog1_ridreth3: 6,
        demog1_dmdeduc: 4,
        demog1_dmdfmsiz: 3,
        demog1_dmdhhsiz: 4,
        demog1_dmdhhsza: 2,
        demog1_dmdhhszb: 1,
        demog1_dmdhhsze: 0,
        demog1_dmdmartl: 1,
        quest22_smq020: 1,
        quest22_smq890: 1,
        quest22_smq900: 0,
        quest23_smd470: 5,
        quest1_alq111: 1,
      },
      latestAssessment: {
        exami1_bpxpls: 1,
        labor1_lbdtcsi: 190,
        labor2_urdflow1: 12,
        labor2_urdtime1: 30,
        labor2_urxvol1: 250,
        quest11_hiq011: 1,
        quest12_heq010: 2,
        quest12_heq030: 2,
        quest15_kiq022: 2,
        quest15_kiq026: 2,
        quest16_mcq010: 1,
        quest16_mcq160b: 2,
        quest16_mcq220: 2,
        quest16_mcq300a: 2,
        quest16_mcq300c: 2,
        quest17_dpq020: 0,
        quest17_dpq030: 1,
        quest17_dpq040: 0,
        quest20_pfq061b: 2,
        quest20_pfq061c: 2,
        quest20_pfq061h: 2,
        quest3_cdq009: 1,
        quest3_cdq010: 2,
        quest7_diq010: 2,
        quest9_dlq050: 1,
      },
      diaries: [
        {
          diaryDate: '2026-04-24',
          sleepRecord: {
            sleepTime: '1970-01-01T22:30:00.000Z',
            wakeTime: '1970-01-01T06:30:00.000Z',
            sleepDurationHours: 8,
          },
          bodyMetrics: [
            {
              bodyHeight: 170,
              bodyWeight: 72,
              bmi: 24.9,
              systolicPressure: 128,
              diastolicPressure: 82,
              timeStamp: '2026-04-24T07:00:00.000Z',
            },
          ],
          symptoms: [
            {
              symptomCode: 'chest_pain',
              isChestPain: true,
              timeStamp: '2026-04-24T09:00:00.000Z',
            },
          ],
          activities: [
            {
              activityCategory: 'work',
              intensityLevel: 'vigorous',
              duration: 45,
              outdoorMinutes: 30,
              timeStamp: '2026-04-24T07:00:00.000Z',
            },
            {
              activityCategory: 'transport',
              transportMode: 'walk',
              duration: 20,
              outdoorMinutes: 15,
              timeStamp: '2026-04-24T09:00:00.000Z',
            },
            {
              activityCategory: 'recreation',
              intensityLevel: 'vigorous',
              duration: 35,
              outdoorMinutes: 10,
              timeStamp: '2026-04-24T17:00:00.000Z',
            },
          ],
          consumptions: [
            {
              energyKcal: 1800,
              proteinG: 90,
              carbohydrateG: 220,
              sugarG: 40,
              fiberG: 25,
              totalFatG: 60,
              saturatedFatG: 18,
              monounsaturatedFatG: 14,
              polyunsaturatedFatG: 9,
              cholesterolMg: 180,
              calciumMg: 900,
            },
          ],
        },
      ],
      vitalSignReadings: [],
      window: {
        startDate: '2026-04-18',
        endDate: '2026-04-24',
      },
    });

    expect(result.missingFields).toEqual([]);
    expect(result.resolvedFields).toHaveLength(ML_V3_ALL_FIELDS.length);
    expect(result.payload.Demog1_RIDAGEYR).toBeGreaterThanOrEqual(20);
    expect(result.payload.Quest22_SMQ890).toBe(1);
    expect(result.payload.Quest22_SMQ900).toBe(0);
    expect(result.payload.Quest21_SLQ3032).toBe(22 * 60 + 30);
    expect(result.payload.Quest21_SLD123).toBe(8);
    expect(result.payload.Exami2_BMXHT).toBe(170);
    expect(result.payload.Exami2_BMXWT).toBe(72);
    expect(result.payload.Exami1_SysPulse).toBe(128);
    expect(result.payload.Exami1_DiaPulse).toBe(82);
    expect(result.payload.Dieta1_DR1TKCAL).toBe(1800);
    expect(result.payload.Quest19_PAD615).toBe(45);
    expect(result.payload.Quest19_PAD645).toBe(20);
    expect(result.payload.Quest19_PAD660).toBe(35);
    expect(result.payload.Quest19_PAQ635).toBe(1);
    expect(result.payload.Quest3_CDQ008).toBe(1);
    expect(result.payload.Quest6_DED1225).toBe(55);
  });

  test('marks unresolved fields as missing instead of silently defaulting to zero', () => {
    const result = buildMlV3Payload({
      patientProfile: {
        dateOfBirth: '2000-04-10',
      },
      diaries: [],
      vitalSignReadings: [],
      window: {
        startDate: '2026-04-18',
        endDate: '2026-04-24',
      },
    });

    expect(result.payload.Demog1_RIDAGEYR).toBeGreaterThanOrEqual(20);
    expect(result.missingFields).toContain('Quest22_SMQ890');
    expect(result.missingFields).toContain('Quest21_SLD123');
    expect(result.missingFields).toContain('Dieta1_DR1TKCAL');
    expect(result.payload.Quest22_SMQ890).toBeUndefined();
  });
});
