const { buildMlV3Payload } = require('./mlPayloadMapper');

function createSnapshot(overrides = {}) {
  return {
    patientProfile: {
      dateOfBirth: '2000-01-01',
      bodyHeightCm: 170,
      ...overrides.patientProfile,
    },
    patientMlProfile: {
      demog1_riagendr: 1,
      demog1_ridreth3: 6,
      demog1_dmdeduc: 6,
      demog1_dmdfmsiz: 4,
      demog1_dmdhhsiz: 2,
      demog1_dmdhhsza: 0,
      demog1_dmdhhszb: 0,
      demog1_dmdhhsze: 3,
      demog1_dmdmartl: 5,
      quest22_smq020: 2,
      quest22_smq890: 2,
      quest22_smq900: 1,
      quest23_smd470: 0,
      quest1_alq111: 1,
      ...overrides.patientMlProfile,
    },
    latestAssessment: {
      assessmentDate: '2026-06-11',
      exami1_bpxpls: 80,
      labor1_lbdtcsi: 5,
      labor2_urdflow1: 49,
      labor2_urdtime1: 60,
      labor2_urxvol1: 400,
      quest11_hiq011: 1,
      quest12_heq010: 2,
      quest12_heq030: 2,
      quest15_kiq022: 2,
      quest15_kiq026: 1,
      quest16_mcq010: 2,
      quest16_mcq160b: 2,
      quest16_mcq220: 2,
      quest16_mcq300a: 1,
      quest16_mcq300c: 1,
      quest17_dpq020: 0,
      quest17_dpq030: 1,
      quest17_dpq040: 0,
      quest20_pfq061b: 1,
      quest20_pfq061c: 1,
      quest20_pfq061h: 1,
      quest3_cdq009: 7,
      quest3_cdq010: 2,
      quest7_diq010: 2,
      quest9_dlq050: 2,
      ...overrides.latestAssessment,
    },
    diaries: [],
    vitalSignReadings: [],
    window: {
      startDate: '2026-06-05',
      endDate: '2026-06-11',
    },
    ...overrides,
  };
}

describe('buildMlV3Payload', () => {
  it('averages activity minutes per active day while preserving distinct day counts', () => {
    const result = buildMlV3Payload(
      createSnapshot({
        diaries: [
          {
            diaryDate: '2026-06-09',
            bodyMetrics: [],
            symptoms: [],
            consumptions: [],
            sleepRecord: null,
            activities: [
              {
                activityCategory: 'work',
                intensityLevel: 'vigorous',
                duration: 10,
                outdoorMinutes: 20,
              },
              {
                activityCategory: 'work',
                intensityLevel: 'vigorous',
                duration: 20,
                outdoorMinutes: 10,
              },
              {
                activityCategory: 'transport',
                transportMode: 'walk',
                duration: 30,
                outdoorMinutes: 15,
              },
            ],
          },
          {
            diaryDate: '2026-06-10',
            bodyMetrics: [],
            symptoms: [],
            consumptions: [],
            sleepRecord: null,
            activities: [
              {
                activityCategory: 'work',
                intensityLevel: 'vigorous',
                duration: 40,
                outdoorMinutes: 30,
              },
              {
                activityCategory: 'transport',
                transportMode: 'bicycle',
                duration: 10,
                outdoorMinutes: 5,
              },
            ],
          },
          {
            diaryDate: '2026-06-11',
            bodyMetrics: [],
            symptoms: [],
            consumptions: [],
            sleepRecord: null,
            activities: [
              {
                activityCategory: 'recreation',
                intensityLevel: 'vigorous',
                duration: 50,
                outdoorMinutes: 45,
              },
            ],
          },
        ],
      })
    );

    expect(result.payload.Quest19_PAD615).toBe(35);
    expect(result.payload.Quest19_PAQ610).toBe(2);
    expect(result.payload.Quest19_PAD645).toBe(20);
    expect(result.payload.Quest19_PAQ635).toBe(1);
    expect(result.payload.Quest19_PAQ640).toBe(2);
    expect(result.payload.Quest19_PAD660).toBe(50);
    expect(result.payload.Quest19_PAQ655).toBe(1);
    expect(result.payload.Quest6_DED1225).toBeCloseTo((45 + 35 + 45) / 3, 5);
  });

  it('averages sleep duration and sleep time across the available window', () => {
    const result = buildMlV3Payload(
      createSnapshot({
        diaries: [
          {
            diaryDate: '2026-06-09',
            bodyMetrics: [],
            symptoms: [],
            consumptions: [],
            activities: [],
            sleepRecord: {
              sleepTime: '23:00',
              wakeTime: '06:00',
              sleepDurationHours: 7,
            },
          },
          {
            diaryDate: '2026-06-10',
            bodyMetrics: [],
            symptoms: [],
            consumptions: [],
            activities: [],
            sleepRecord: {
              sleepTime: '01:00',
              wakeTime: '08:30',
              sleepDurationHours: 7.5,
            },
          },
          {
            diaryDate: '2026-06-11',
            bodyMetrics: [],
            symptoms: [],
            consumptions: [],
            activities: [],
            sleepRecord: {
              sleepTime: '00:30',
              wakeTime: '07:30',
              sleepDurationHours: 7,
            },
          },
        ],
      })
    );

    expect(result.payload.Quest21_SLD123).toBeCloseTo(7.1666667, 5);
    expect(result.payload.Quest21_SLQ3032).toBeCloseTo(10, 0);
  });
});
