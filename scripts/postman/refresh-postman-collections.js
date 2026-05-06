const fs = require('fs');
const path = require('path');
const { ML_V3_ALL_FIELDS } = require('../../src/utils/mlPayloadMapper');

const rootDir = path.join(__dirname, '..', '..');
const mainCollectionPath = path.join(rootDir, 'postman', 'PulseWise-API.postman_collection.json');
const smokeCollectionPath = path.join(
  rootDir,
  'postman',
  'PulseWise-Dashboard-Smoke.postman_collection.json'
);
const environmentPath = path.join(rootDir, 'postman', 'PulseWise-Local.postman_environment.json');
const productionEnvironmentPath = path.join(
  rootDir,
  'postman',
  'environments',
  'PulseWise-Production.postman_environment.json'
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function upsertFolder(collection, folderName, items) {
  const existingIndex = collection.item.findIndex((entry) => entry.name === folderName);
  const folder = {
    name: folderName,
    item: items,
  };

  if (existingIndex === -1) {
    collection.item.push(folder);
    return;
  }

  collection.item[existingIndex] = folder;
}

function bearerHeader(tokenVariable) {
  return [
    {
      key: 'Authorization',
      value: `Bearer {{${tokenVariable}}}`,
    },
    {
      key: 'Content-Type',
      value: 'application/json',
    },
  ];
}

const STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

function responseExample({ name, code, body, status }) {
  return {
    name,
    code,
    status: status || STATUS_TEXT[code] || 'OK',
    body,
  };
}

function serializeExamples(responseExamples, request) {
  return responseExamples.map((entry) => ({
    name: entry.name,
    originalRequest: request,
    status: entry.status || STATUS_TEXT[entry.code] || 'OK',
    code: entry.code,
    _postman_previewlanguage: 'json',
    header: [
      {
        key: 'Content-Type',
        value: 'application/json',
      },
    ],
    cookie: [],
    body: `${JSON.stringify(entry.body, null, 2)}\n`,
  }));
}

function buildSampleMlPayload() {
  const values = {
    Demog1_RIDAGEYR: 26,
    Demog1_RIAGENDR: 1,
    Demog1_RIDRETH3: 6,
    Demog1_DMDEDUC: 4,
    Demog1_DMDFMSIZ: 3,
    Demog1_DMDHHSIZ: 3,
    Demog1_DMDHHSZA: 2,
    Demog1_DMDHHSZB: 1,
    Demog1_DMDHHSZE: 0,
    Demog1_DMDMARTL: 1,
    Quest1_ALQ111: 2,
    Quest22_SMQ020: 1,
    Quest22_SMQ890: 1,
    Quest22_SMQ900: 2,
    Quest23_SMD470: 0,
    Quest11_HIQ011: 1,
    Quest12_HEQ010: 2,
    Quest12_HEQ030: 2,
    Quest15_KIQ022: 2,
    Quest15_KIQ026: 2,
    Quest16_MCQ010: 2,
    Quest16_MCQ160B: 2,
    Quest16_MCQ220: 2,
    Quest16_MCQ300A: 2,
    Quest16_MCQ300C: 2,
    Quest17_DPQ020: 0,
    Quest17_DPQ030: 0,
    Quest17_DPQ040: 0,
    Quest20_PFQ061B: 2,
    Quest20_PFQ061C: 2,
    Quest20_PFQ061H: 2,
    Quest3_CDQ008: 1,
    Quest3_CDQ009: 2,
    Quest3_CDQ010: 2,
    Quest7_DIQ010: 2,
    Quest9_DLQ050: 2,
    Quest21_SLQ3032: 1350,
    Quest21_SLD123: 8,
    Quest6_DED1225: 95,
    Quest19_PAD615: 45,
    Quest19_PAQ610: 1,
    Quest19_PAD645: 20,
    Quest19_PAQ635: 1,
    Quest19_PAQ640: 1,
    Quest19_PAD660: 30,
    Quest19_PAQ655: 1,
    Exami2_BMXHT: 168,
    Exami2_BMXWT: 72,
    Exami2_BMXBMI: 25.5,
    Exami1_SysPulse: 122,
    Exami1_DiaPulse: 82,
    Exami1_BPXPLS: 1,
    Labor1_LBDTCSI: 180,
    Labor2_URDFLOW1: 1.2,
    Labor2_URDTIME1: 45,
    Labor2_URXVOL1: 200,
    Dieta1_DR1TKCAL: 650,
    Dieta1_DR1TPROT: 35,
    Dieta1_DR1TCARB: 70,
    Dieta1_DR1TSUGR: 12,
    Dieta1_DR1TFIBE: 9,
    Dieta1_DR1TTFAT: 20,
    Dieta1_DR1TSFAT: 6,
    Dieta1_DR1TMFAT: 7,
    Dieta1_DR1TPFAT: 5,
    Dieta1_DR1TCHOL: 120,
    Dieta1_DR1TCALC: 300,
  };

  return ML_V3_ALL_FIELDS.reduce((accumulator, field) => {
    accumulator[field] = values[field] ?? 0;
    return accumulator;
  }, {});
}

const SAMPLE_ML_PROFILE = {
  patientId: '29a8cae4-ba34-4418-baf0-0ba776fbec6b',
  demog1_riagendr: 1,
  demog1_ridreth3: 6,
  demog1_dmdeduc: 4,
  demog1_dmdfmsiz: 3,
  demog1_dmdhhsiz: 3,
  demog1_dmdhhsza: 2,
  demog1_dmdhhszb: 1,
  demog1_dmdhhsze: 0,
  demog1_dmdmartl: 1,
  quest22_smq020: 1,
  quest22_smq890: 1,
  quest22_smq900: 2,
  quest23_smd470: 0,
  quest1_alq111: 2,
  createdAt: '2026-04-24T22:10:00.000Z',
  updatedAt: '2026-04-24T22:10:00.000Z',
};

const SAMPLE_ML_ASSESSMENT = {
  assessmentId: '4fd93f28-a710-4d86-b50f-1cfcb3f97f8e',
  patientId: '29a8cae4-ba34-4418-baf0-0ba776fbec6b',
  assessmentDate: '2026-04-24T00:00:00.000Z',
  exami1_bpxpls: 1,
  labor1_lbdtcsi: 180,
  labor2_urdflow1: 1.2,
  labor2_urdtime1: 45,
  labor2_urxvol1: 200,
  quest11_hiq011: 1,
  quest12_heq010: 2,
  quest12_heq030: 2,
  quest15_kiq022: 2,
  quest15_kiq026: 2,
  quest16_mcq010: 2,
  quest16_mcq160b: 2,
  quest16_mcq220: 2,
  quest16_mcq300a: 2,
  quest16_mcq300c: 2,
  quest17_dpq020: 0,
  quest17_dpq030: 0,
  quest17_dpq040: 0,
  quest20_pfq061b: 2,
  quest20_pfq061c: 2,
  quest20_pfq061h: 2,
  quest3_cdq009: 2,
  quest3_cdq010: 2,
  quest7_diq010: 2,
  quest9_dlq050: 2,
  createdAt: '2026-04-24T22:11:00.000Z',
  updatedAt: '2026-04-24T22:11:00.000Z',
};

const SAMPLE_SLEEP_RECORD = {
  sleepRecordId: '1c3b1d08-55f7-4307-8d61-c75882c98c9f',
  diaryId: '31476548-8604-4a1a-b9d7-c5ae1d40cb74',
  sleepTime: '22:30',
  wakeTime: '06:30',
  sleepDurationHours: 8,
  source: 'postman_manual',
  createdAt: '2026-04-24T22:12:00.000Z',
  updatedAt: '2026-04-24T22:12:00.000Z',
};

const SAMPLE_ML_WINDOW = {
  startDate: '2026-04-18',
  endDate: '2026-04-24',
};

const SAMPLE_ML_SOURCE_SUMMARY = {
  window: SAMPLE_ML_WINDOW,
  diaryDays: 7,
  dietDaysWithSnapshot: 1,
  latestAssessmentDate: '2026-04-24',
  latestSleepDiaryDate: '2026-04-24',
  latestBodyMetricDate: '2026-04-24',
  biometricFallbackFields: [],
};

const SAMPLE_ML_UPSTREAM_PREDICTION = {
  endpoint: 'https://ml.darrellvalentino.com/v3/predictions/',
  status: 200,
  body: {
    result: {
      label: '0',
      probability: '1.105013769119978',
    },
  },
};

const SAMPLE_ML_UPSTREAM_RECOMMENDATION = {
  endpoint: 'https://ml.darrellvalentino.com/v3/recommendations/',
  status: 200,
  body: {
    result: 'success',
    recommendationResult: {
      riskReduction: 1.083273136464413,
      lifestyle: [
        {
          category: 'nutrition',
          title: 'Kurangi konsumsi garam harian',
          recommendation: 'Batasi makanan tinggi sodium dan pilih makanan segar.',
        },
        {
          category: 'activity',
          title: 'Pertahankan aktivitas fisik terstruktur',
          recommendation: 'Lakukan aktivitas aerobik intensitas sedang secara konsisten.',
        },
      ],
    },
  },
};

function jsonRequest({ name, method, url, tokenVariable, body, testScript, response = [] }) {
  const request = {
    method,
    header: tokenVariable ? bearerHeader(tokenVariable) : [{ key: 'Content-Type', value: 'application/json' }],
    url,
  };

  if (body !== undefined) {
    request.body = {
      mode: 'raw',
      raw: body,
    };
  }

  const item = {
    name,
    request,
    response:
      response.length && !response[0].originalRequest ? serializeExamples(response, request) : response,
  };

  if (testScript?.length) {
    item.event = [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: testScript,
        },
      },
    ];
  }

  return item;
}

function patientMlProfileResponses(successMessage) {
  return [
    responseExample({
      name: '200 ML profile success',
      code: 200,
      body: {
        success: true,
        message: successMessage,
        data: SAMPLE_ML_PROFILE,
      },
    }),
  ];
}

function patientMlAssessmentResponses({ message, code = 200, body = SAMPLE_ML_ASSESSMENT }) {
  return [
    responseExample({
      name: `${code} ML assessment success`,
      code,
      body: {
        success: true,
        message,
        data: body,
      },
    }),
  ];
}

function sleepRecordResponses(message) {
  return [
    responseExample({
      name: '200 Sleep diary success',
      code: 200,
      body: {
        success: true,
        message,
        data: SAMPLE_SLEEP_RECORD,
      },
    }),
  ];
}

function readinessResponses(message) {
  return [
    responseExample({
      name: '200 ML readiness success',
      code: 200,
      body: {
        success: true,
        message,
        data: {
          ready: true,
          missingFields: [],
          resolvedFields: ML_V3_ALL_FIELDS,
          window: SAMPLE_ML_WINDOW,
          sourceSummary: SAMPLE_ML_SOURCE_SUMMARY,
        },
      },
    }),
    responseExample({
      name: '409 ML not ready',
      code: 409,
      body: {
        success: false,
        message: 'Data pasien belum siap untuk inference ML',
        details: {
          code: 'ML_NOT_READY',
          ready: false,
          missingFields: ['Quest21_SLD123', 'Dieta1_DR1TKCAL'],
          resolvedFields: ['Demog1_RIDAGEYR', 'Exami2_BMXHT'],
          window: SAMPLE_ML_WINDOW,
          sourceSummary: SAMPLE_ML_SOURCE_SUMMARY,
        },
      },
    }),
  ];
}

function payloadResponses(message) {
  return [
    responseExample({
      name: '200 ML payload success',
      code: 200,
      body: {
        success: true,
        message,
        data: {
          mlVersion: 'hfms-v3',
          window: SAMPLE_ML_WINDOW,
          payload: buildSampleMlPayload(),
          sourceSummary: SAMPLE_ML_SOURCE_SUMMARY,
        },
      },
    }),
  ];
}

function predictionResponses(message) {
  return [
    responseExample({
      name: '200 ML prediction success',
      code: 200,
      body: {
        success: true,
        message,
        data: {
          resultId: 'f0f49556-5fbf-4ed3-b4b4-4f32f9f4ebf2',
          generatedAt: '2026-05-05T12:30:00.000Z',
          mlVersion: 'hfms-v3',
          window: SAMPLE_ML_WINDOW,
          payloadHash: 'sha256:8dc6b9ce2c1d6db4a98fe1b14d4f5d55f2f3c44f365d0c7aa8aa18be667d6d2d',
          sourceSummary: SAMPLE_ML_SOURCE_SUMMARY,
          payload: buildSampleMlPayload(),
          upstream: SAMPLE_ML_UPSTREAM_PREDICTION,
        },
      },
    }),
  ];
}

function recommendationResponses(message) {
  return [
    responseExample({
      name: '200 ML recommendation success',
      code: 200,
      body: {
        success: true,
        message,
        data: {
          resultId: 'f0f49556-5fbf-4ed3-b4b4-4f32f9f4ebf2',
          generatedAt: '2026-05-05T12:30:00.000Z',
          mlVersion: 'hfms-v3',
          window: SAMPLE_ML_WINDOW,
          payloadHash: 'sha256:8dc6b9ce2c1d6db4a98fe1b14d4f5d55f2f3c44f365d0c7aa8aa18be667d6d2d',
          sourceSummary: SAMPLE_ML_SOURCE_SUMMARY,
          payload: buildSampleMlPayload(),
          upstream: SAMPLE_ML_UPSTREAM_RECOMMENDATION,
        },
      },
    }),
  ];
}

function mlInferenceResultResponses(message, inferenceType, upstream) {
  return [
    responseExample({
      name: `200 ML ${inferenceType} latest success`,
      code: 200,
      body: {
        success: true,
        message,
        data: {
          resultId: 'f0f49556-5fbf-4ed3-b4b4-4f32f9f4ebf2',
          patientId: '29a8cae4-ba34-4418-baf0-0ba776fbec6b',
          requestedByUserId: '29a8cae4-ba34-4418-baf0-0ba776fbec6b',
          inferenceType,
          requestContext: 'patient',
          mlVersion: 'hfms-v3',
          payloadHash: 'sha256:8dc6b9ce2c1d6db4a98fe1b14d4f5d55f2f3c44f365d0c7aa8aa18be667d6d2d',
          payload: null,
          sourceSummary: SAMPLE_ML_SOURCE_SUMMARY,
          window: SAMPLE_ML_WINDOW,
          upstream,
          generatedAt: '2026-05-05T12:30:00.000Z',
          createdAt: '2026-05-05T12:30:00.000Z',
        },
      },
    }),
  ];
}

function mlInferenceHistoryResponses(message, inferenceType, upstream) {
  return [
    responseExample({
      name: `200 ML ${inferenceType} history success`,
      code: 200,
      body: {
        success: true,
        message,
        data: {
          items: [
            {
              resultId: 'f0f49556-5fbf-4ed3-b4b4-4f32f9f4ebf2',
              patientId: '29a8cae4-ba34-4418-baf0-0ba776fbec6b',
              requestedByUserId: '29a8cae4-ba34-4418-baf0-0ba776fbec6b',
              inferenceType,
              requestContext: 'patient',
              mlVersion: 'hfms-v3',
              payloadHash: 'sha256:8dc6b9ce2c1d6db4a98fe1b14d4f5d55f2f3c44f365d0c7aa8aa18be667d6d2d',
              payload: null,
              sourceSummary: SAMPLE_ML_SOURCE_SUMMARY,
              window: SAMPLE_ML_WINDOW,
              upstream,
              generatedAt: '2026-05-05T12:30:00.000Z',
              createdAt: '2026-05-05T12:30:00.000Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            totalItems: 1,
            totalPages: 1,
          },
        },
      },
    }),
  ];
}

function changePasswordResponses() {
  return [
    responseExample({
      name: '200 Password changed',
      code: 200,
      body: {
        success: true,
        message: 'Password berhasil diperbarui',
        data: {
          nextStep: 'LOGIN_AGAIN',
        },
      },
    }),
    responseExample({
      name: '400 Validation failed or same password',
      code: 400,
      body: {
        success: false,
        message: 'Validasi request gagal',
        details: {
          issues: [
            {
              path: ['confirmNewPassword'],
              message: 'Konfirmasi password baru tidak sama',
            },
          ],
        },
      },
    }),
    responseExample({
      name: '401 Current password invalid',
      code: 401,
      body: {
        success: false,
        message: 'Password saat ini salah',
        details: null,
      },
    }),
    responseExample({
      name: '403 Google account not supported',
      code: 403,
      body: {
        success: false,
        message: 'Ubah password hanya tersedia untuk akun email/password',
        details: {
          nextStep: 'USE_GOOGLE_LOGIN',
        },
      },
    }),
  ];
}

function buildMainMlFolders() {
  return [
    {
      name: 'ML - Profile & Assessment',
      item: [
        jsonRequest({
          name: 'GET Patient ML Profile',
          method: 'GET',
          url: '{{baseUrl}}/patients/{{patientId}}/ml-profile',
          tokenVariable: 'patientToken',
          response: patientMlProfileResponses('ML profile pasien berhasil diambil'),
        }),
        jsonRequest({
          name: 'PUT Patient ML Profile',
          method: 'PUT',
          url: '{{baseUrl}}/patients/{{patientId}}/ml-profile',
          tokenVariable: 'patientToken',
          body: JSON.stringify(
            {
              demog1_riagendr: 1,
              demog1_ridreth3: 6,
              demog1_dmdeduc: 4,
              demog1_dmdfmsiz: 3,
              demog1_dmdhhsiz: 3,
              demog1_dmdhhsza: 2,
              demog1_dmdhhszb: 1,
              demog1_dmdhhsze: 0,
              demog1_dmdmartl: 1,
              quest22_smq020: 1,
              quest22_smq890: 1,
              quest22_smq900: 2,
              quest23_smd470: 0,
              quest1_alq111: 2,
            },
            null,
            2
          ),
          response: patientMlProfileResponses('ML profile pasien berhasil diperbarui'),
        }),
        jsonRequest({
          name: 'GET Latest Patient ML Assessment',
          method: 'GET',
          url: '{{baseUrl}}/patients/{{patientId}}/ml-assessments/latest',
          tokenVariable: 'patientToken',
          response: patientMlAssessmentResponses({
            message: 'Assessment ML terbaru berhasil diambil',
          }),
        }),
        jsonRequest({
          name: 'GET List Patient ML Assessments',
          method: 'GET',
          url: '{{baseUrl}}/patients/{{patientId}}/ml-assessments?startDate={{mlDate}}&endDate={{mlDate}}',
          tokenVariable: 'patientToken',
          response: [
            responseExample({
              name: '200 ML assessment list success',
              code: 200,
              body: {
                success: true,
                message: 'Daftar assessment ML berhasil diambil',
                data: {
                  items: [SAMPLE_ML_ASSESSMENT],
                },
              },
            }),
          ],
        }),
        jsonRequest({
          name: 'POST Create Patient ML Assessment',
          method: 'POST',
          url: '{{baseUrl}}/patients/{{patientId}}/ml-assessments',
          tokenVariable: 'patientToken',
          body: JSON.stringify(
            {
              assessmentDate: '{{mlDate}}',
              exami1_bpxpls: 1,
              labor1_lbdtcsi: 180,
              labor2_urdflow1: 1.2,
              labor2_urdtime1: 45,
              labor2_urxvol1: 200,
              quest11_hiq011: 1,
              quest12_heq010: 2,
              quest12_heq030: 2,
              quest15_kiq022: 2,
              quest15_kiq026: 2,
              quest16_mcq010: 2,
              quest16_mcq160b: 2,
              quest16_mcq220: 2,
              quest16_mcq300a: 2,
              quest16_mcq300c: 2,
              quest17_dpq020: 0,
              quest17_dpq030: 0,
              quest17_dpq040: 0,
              quest20_pfq061b: 2,
              quest20_pfq061c: 2,
              quest20_pfq061h: 2,
              quest3_cdq009: 2,
              quest3_cdq010: 2,
              quest7_diq010: 2,
              quest9_dlq050: 2,
            },
            null,
            2
          ),
          testScript: [
            "pm.test('Status 200/201', function () { pm.expect([200, 201]).to.include(pm.response.code); });",
            'const json = pm.response.json();',
            "if (json?.data?.assessmentId) { pm.environment.set('mlAssessmentId', json.data.assessmentId); }",
          ],
          response: patientMlAssessmentResponses({
            message: 'Assessment ML berhasil dibuat',
            code: 201,
          }),
        }),
        jsonRequest({
          name: 'PUT Update Patient ML Assessment',
          method: 'PUT',
          url: '{{baseUrl}}/patients/{{patientId}}/ml-assessments/{{mlAssessmentId}}',
          tokenVariable: 'patientToken',
          body: JSON.stringify(
            {
              assessmentDate: '{{mlDate}}',
              labor1_lbdtcsi: 175,
              quest17_dpq020: 1,
              quest17_dpq030: 0,
              quest17_dpq040: 0,
            },
            null,
            2
          ),
          response: patientMlAssessmentResponses({
            message: 'Assessment ML berhasil diperbarui',
          }),
        }),
      ],
    },
    {
      name: 'ML - Sleep & Inference',
      item: [
        jsonRequest({
          name: 'GET Sleep Diary By Date',
          method: 'GET',
          url: '{{baseUrl}}/users/{{patientId}}/diaries/by-date/sleep?date={{mlDate}}',
          tokenVariable: 'patientToken',
          response: sleepRecordResponses('Sleep diary berdasarkan tanggal berhasil diambil'),
        }),
        jsonRequest({
          name: 'PUT Sleep Diary By Date',
          method: 'PUT',
          url: '{{baseUrl}}/users/{{patientId}}/diaries/by-date/sleep',
          tokenVariable: 'patientToken',
          body: JSON.stringify(
            {
              diaryDate: '{{mlDate}}',
              sleepTime: '22:30',
              wakeTime: '06:30',
              sleepDurationHours: 8,
              source: 'postman_manual',
            },
            null,
            2
          ),
          response: sleepRecordResponses('Sleep diary berdasarkan tanggal berhasil disimpan'),
        }),
        jsonRequest({
          name: 'GET Patient ML Readiness',
          method: 'GET',
          url: '{{baseUrl}}/users/{{patientId}}/ml-readiness?date={{mlDate}}',
          tokenVariable: 'patientToken',
          response: readinessResponses('Status readiness ML pasien berhasil diambil'),
        }),
        jsonRequest({
          name: 'GET Patient ML Payload',
          method: 'GET',
          url: '{{baseUrl}}/users/{{patientId}}/ml-payload?date={{mlDate}}',
          tokenVariable: 'patientToken',
          response: payloadResponses('Payload ML pasien berhasil dibentuk'),
        }),
        jsonRequest({
          name: 'POST Patient ML Predictions',
          method: 'POST',
          url: '{{baseUrl}}/users/{{patientId}}/ml-predictions?date={{mlDate}}&includePayload=true',
          tokenVariable: 'patientToken',
          body: '{}',
          response: predictionResponses('Prediksi dari microservice ML berhasil diambil'),
        }),
        jsonRequest({
          name: 'GET Patient Latest ML Prediction',
          method: 'GET',
          url: '{{baseUrl}}/users/{{patientId}}/ml-predictions/latest',
          tokenVariable: 'patientToken',
          response: mlInferenceResultResponses(
            'Prediksi ML terbaru pasien berhasil diambil',
            'prediction',
            SAMPLE_ML_UPSTREAM_PREDICTION
          ),
        }),
        jsonRequest({
          name: 'GET Patient ML Prediction History',
          method: 'GET',
          url: '{{baseUrl}}/users/{{patientId}}/ml-predictions/history?page=1&limit=10',
          tokenVariable: 'patientToken',
          response: mlInferenceHistoryResponses(
            'Riwayat prediksi ML pasien berhasil diambil',
            'prediction',
            SAMPLE_ML_UPSTREAM_PREDICTION
          ),
        }),
        jsonRequest({
          name: 'POST Patient ML Recommendations',
          method: 'POST',
          url: '{{baseUrl}}/users/{{patientId}}/ml-recommendations?date={{mlDate}}&includePayload=true',
          tokenVariable: 'patientToken',
          body: '{}',
          response: recommendationResponses('Rekomendasi dari microservice ML berhasil diambil'),
        }),
        jsonRequest({
          name: 'GET Patient Latest ML Recommendation',
          method: 'GET',
          url: '{{baseUrl}}/users/{{patientId}}/ml-recommendations/latest',
          tokenVariable: 'patientToken',
          response: mlInferenceResultResponses(
            'Rekomendasi ML terbaru pasien berhasil diambil',
            'recommendation',
            SAMPLE_ML_UPSTREAM_RECOMMENDATION
          ),
        }),
        jsonRequest({
          name: 'GET Patient ML Recommendation History',
          method: 'GET',
          url: '{{baseUrl}}/users/{{patientId}}/ml-recommendations/history?page=1&limit=10',
          tokenVariable: 'patientToken',
          response: mlInferenceHistoryResponses(
            'Riwayat rekomendasi ML pasien berhasil diambil',
            'recommendation',
            SAMPLE_ML_UPSTREAM_RECOMMENDATION
          ),
        }),
      ],
    },
    {
      name: 'ML - Doctor Dashboard',
      item: [
        jsonRequest({
          name: 'GET Dashboard Patient ML Readiness',
          method: 'GET',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-readiness?date={{mlDate}}',
          tokenVariable: 'doctorToken',
          response: readinessResponses('Status readiness ML pasien dashboard berhasil diambil'),
        }),
        jsonRequest({
          name: 'GET Dashboard Patient ML Payload',
          method: 'GET',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-payload?date={{mlDate}}',
          tokenVariable: 'doctorToken',
          response: payloadResponses('Payload ML pasien dashboard berhasil dibentuk'),
        }),
        jsonRequest({
          name: 'POST Dashboard Patient ML Predictions',
          method: 'POST',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-predictions?date={{mlDate}}&includePayload=true',
          tokenVariable: 'doctorToken',
          body: '{}',
          response: predictionResponses('Prediksi ML pasien dashboard berhasil diambil'),
        }),
        jsonRequest({
          name: 'GET Dashboard Patient Latest ML Prediction',
          method: 'GET',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-predictions/latest',
          tokenVariable: 'doctorToken',
          response: mlInferenceResultResponses(
            'Prediksi ML terbaru pasien dashboard berhasil diambil',
            'prediction',
            SAMPLE_ML_UPSTREAM_PREDICTION
          ),
        }),
        jsonRequest({
          name: 'GET Dashboard Patient ML Prediction History',
          method: 'GET',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-predictions/history?page=1&limit=10',
          tokenVariable: 'doctorToken',
          response: mlInferenceHistoryResponses(
            'Riwayat prediksi ML pasien dashboard berhasil diambil',
            'prediction',
            SAMPLE_ML_UPSTREAM_PREDICTION
          ),
        }),
        jsonRequest({
          name: 'POST Dashboard Patient ML Recommendations',
          method: 'POST',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-recommendations?date={{mlDate}}&includePayload=true',
          tokenVariable: 'doctorToken',
          body: '{}',
          response: recommendationResponses('Rekomendasi ML pasien dashboard berhasil diambil'),
        }),
        jsonRequest({
          name: 'GET Dashboard Patient Latest ML Recommendation',
          method: 'GET',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-recommendations/latest',
          tokenVariable: 'doctorToken',
          response: mlInferenceResultResponses(
            'Rekomendasi ML terbaru pasien dashboard berhasil diambil',
            'recommendation',
            SAMPLE_ML_UPSTREAM_RECOMMENDATION
          ),
        }),
        jsonRequest({
          name: 'GET Dashboard Patient ML Recommendation History',
          method: 'GET',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-recommendations/history?page=1&limit=10',
          tokenVariable: 'doctorToken',
          response: mlInferenceHistoryResponses(
            'Riwayat rekomendasi ML pasien dashboard berhasil diambil',
            'recommendation',
            SAMPLE_ML_UPSTREAM_RECOMMENDATION
          ),
        }),
      ],
    },
  ];
}

function buildSmokeMlFolder() {
  return {
    name: 'Dashboard ML Smoke',
    item: [
      jsonRequest({
        name: 'GET Patient ML Readiness',
        method: 'GET',
        url: '{{baseUrl}}/users/{{patientId}}/ml-readiness?date={{mlDate}}',
        tokenVariable: 'patientToken',
        response: readinessResponses('Status readiness ML pasien berhasil diambil'),
      }),
      jsonRequest({
        name: 'POST Patient ML Recommendation',
        method: 'POST',
        url: '{{baseUrl}}/users/{{patientId}}/ml-recommendations?date={{mlDate}}&includePayload=true',
        tokenVariable: 'patientToken',
        body: '{}',
        response: recommendationResponses('Rekomendasi dari microservice ML berhasil diambil'),
      }),
      jsonRequest({
        name: 'GET Doctor Dashboard ML Readiness',
        method: 'GET',
        url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-readiness?date={{mlDate}}',
        tokenVariable: 'doctorToken',
        response: readinessResponses('Status readiness ML pasien dashboard berhasil diambil'),
      }),
      jsonRequest({
        name: 'POST Doctor Dashboard ML Recommendation',
        method: 'POST',
        url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-recommendations?date={{mlDate}}&includePayload=true',
        tokenVariable: 'doctorToken',
        body: '{}',
        response: recommendationResponses('Rekomendasi ML pasien dashboard berhasil diambil'),
      }),
    ],
  };
}

function buildSmokeAuthReferenceFolder() {
  return {
    name: 'Auth Reference (Manual)',
    item: [
      jsonRequest({
        name: 'POST Change Password',
        method: 'POST',
        url: '{{baseUrl}}/auth/change-password',
        tokenVariable: 'patientToken',
        body: JSON.stringify(
          {
            currentPassword: '{{patientPassword}}',
            newPassword: 'new-password-123',
            confirmNewPassword: 'new-password-123',
          },
          null,
          2
        ),
        response: changePasswordResponses(),
      }),
    ],
  };
}

function upsertEnvironmentValue(environment, key, value, type = 'default') {
  const index = environment.values.findIndex((entry) => entry.key === key);
  const nextValue = {
    key,
    value,
    type,
    enabled: true,
  };

  if (index === -1) {
    environment.values.push(nextValue);
    return;
  }

  environment.values[index] = {
    ...environment.values[index],
    ...nextValue,
  };
}

function main() {
  const mainCollection = readJson(mainCollectionPath);
  const smokeCollection = readJson(smokeCollectionPath);
  const environment = readJson(environmentPath);
  const productionEnvironment = readJson(productionEnvironmentPath);

  for (const folder of buildMainMlFolders()) {
    upsertFolder(mainCollection, folder.name, folder.item);
  }

  upsertFolder(smokeCollection, 'Dashboard ML Smoke', buildSmokeMlFolder().item);
  upsertFolder(smokeCollection, 'Auth Reference (Manual)', buildSmokeAuthReferenceFolder().item);

  upsertEnvironmentValue(environment, 'baseUrl', 'http://localhost:5000');
  upsertEnvironmentValue(environment, 'hfmsBaseUrl', 'http://localhost:8080');
  upsertEnvironmentValue(environment, 'patientEmail', 'postman.patient@pulsewise.local');
  upsertEnvironmentValue(environment, 'patientUsername', 'postman_patient_local');
  upsertEnvironmentValue(environment, 'patientFirstName', 'Postman');
  upsertEnvironmentValue(environment, 'patientLastName', 'Patient');
  upsertEnvironmentValue(environment, 'seedPatientEmail', 'seed.patient2@pulsewise.local');
  upsertEnvironmentValue(environment, 'mlDate', '2026-04-24');
  upsertEnvironmentValue(environment, 'mlAssessmentId', '');

  upsertEnvironmentValue(productionEnvironment, 'baseUrl', 'https://api.darrellvalentino.com');
  upsertEnvironmentValue(productionEnvironment, 'publicApiOrigin', 'https://api.darrellvalentino.com');
  upsertEnvironmentValue(productionEnvironment, 'mlPublicOrigin', 'https://ml.darrellvalentino.com');
  upsertEnvironmentValue(productionEnvironment, 'fallbackIpBaseUrl', 'http://168.144.44.43');
  upsertEnvironmentValue(productionEnvironment, 'hfmsBaseUrl', 'https://ml.darrellvalentino.com');
  upsertEnvironmentValue(productionEnvironment, 'patientEmail', 'seed.patient2@pulsewise.local');
  upsertEnvironmentValue(productionEnvironment, 'patientPassword', 'dev12345', 'secret');
  upsertEnvironmentValue(productionEnvironment, 'patientUsername', 'seed_patient_prod');
  upsertEnvironmentValue(productionEnvironment, 'patientFirstName', 'Seed');
  upsertEnvironmentValue(productionEnvironment, 'patientLastName', 'Patient');
  upsertEnvironmentValue(productionEnvironment, 'doctorEmail', 'doctor@pulsewise.local');
  upsertEnvironmentValue(productionEnvironment, 'doctorPassword', 'dev12345', 'secret');
  upsertEnvironmentValue(productionEnvironment, 'doctorUsername', 'doctor_prod');
  upsertEnvironmentValue(productionEnvironment, 'seedPatientEmail', 'seed.patient2@pulsewise.local');
  upsertEnvironmentValue(productionEnvironment, 'mlDate', '2026-04-24');
  upsertEnvironmentValue(productionEnvironment, 'mlAssessmentId', '');

  writeJson(mainCollectionPath, mainCollection);
  writeJson(smokeCollectionPath, smokeCollection);
  writeJson(environmentPath, environment);
  writeJson(productionEnvironmentPath, productionEnvironment);
}

main();
