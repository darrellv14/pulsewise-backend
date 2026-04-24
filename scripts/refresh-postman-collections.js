const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const mainCollectionPath = path.join(rootDir, 'postman', 'PulseWise-API.postman_collection.json');
const smokeCollectionPath = path.join(
  rootDir,
  'postman',
  'PulseWise-Dashboard-Smoke.postman_collection.json'
);
const environmentPath = path.join(rootDir, 'postman', 'PulseWise-Local.postman_environment.json');

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
    response,
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
        }),
        jsonRequest({
          name: 'GET Latest Patient ML Assessment',
          method: 'GET',
          url: '{{baseUrl}}/patients/{{patientId}}/ml-assessments/latest',
          tokenVariable: 'patientToken',
        }),
        jsonRequest({
          name: 'GET List Patient ML Assessments',
          method: 'GET',
          url: '{{baseUrl}}/patients/{{patientId}}/ml-assessments?startDate={{mlDate}}&endDate={{mlDate}}',
          tokenVariable: 'patientToken',
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
        }),
        jsonRequest({
          name: 'GET Patient ML Readiness',
          method: 'GET',
          url: '{{baseUrl}}/users/{{patientId}}/ml-readiness?date={{mlDate}}',
          tokenVariable: 'patientToken',
        }),
        jsonRequest({
          name: 'GET Patient ML Payload',
          method: 'GET',
          url: '{{baseUrl}}/users/{{patientId}}/ml-payload?date={{mlDate}}',
          tokenVariable: 'patientToken',
        }),
        jsonRequest({
          name: 'POST Patient ML Predictions',
          method: 'POST',
          url: '{{baseUrl}}/users/{{patientId}}/ml-predictions?date={{mlDate}}&includePayload=true',
          tokenVariable: 'patientToken',
          body: '{}',
        }),
        jsonRequest({
          name: 'POST Patient ML Recommendations',
          method: 'POST',
          url: '{{baseUrl}}/users/{{patientId}}/ml-recommendations?date={{mlDate}}&includePayload=true',
          tokenVariable: 'patientToken',
          body: '{}',
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
        }),
        jsonRequest({
          name: 'GET Dashboard Patient ML Payload',
          method: 'GET',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-payload?date={{mlDate}}',
          tokenVariable: 'doctorToken',
        }),
        jsonRequest({
          name: 'POST Dashboard Patient ML Predictions',
          method: 'POST',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-predictions?date={{mlDate}}&includePayload=true',
          tokenVariable: 'doctorToken',
          body: '{}',
        }),
        jsonRequest({
          name: 'POST Dashboard Patient ML Recommendations',
          method: 'POST',
          url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-recommendations?date={{mlDate}}&includePayload=true',
          tokenVariable: 'doctorToken',
          body: '{}',
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
      }),
      jsonRequest({
        name: 'POST Patient ML Recommendation',
        method: 'POST',
        url: '{{baseUrl}}/users/{{patientId}}/ml-recommendations?date={{mlDate}}&includePayload=true',
        tokenVariable: 'patientToken',
        body: '{}',
      }),
      jsonRequest({
        name: 'GET Doctor Dashboard ML Readiness',
        method: 'GET',
        url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-readiness?date={{mlDate}}',
        tokenVariable: 'doctorToken',
      }),
      jsonRequest({
        name: 'POST Doctor Dashboard ML Recommendation',
        method: 'POST',
        url: '{{baseUrl}}/doctors/{{doctorId}}/dashboard/patients/{{patientId}}/ml-recommendations?date={{mlDate}}&includePayload=true',
        tokenVariable: 'doctorToken',
        body: '{}',
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

  for (const folder of buildMainMlFolders()) {
    upsertFolder(mainCollection, folder.name, folder.item);
  }

  upsertFolder(smokeCollection, 'Dashboard ML Smoke', buildSmokeMlFolder().item);

  upsertEnvironmentValue(environment, 'baseUrl', 'http://localhost:5000/api/v1');
  upsertEnvironmentValue(environment, 'hfmsBaseUrl', 'http://localhost:8080');
  upsertEnvironmentValue(environment, 'patientEmail', 'postman.patient@pulsewise.local');
  upsertEnvironmentValue(environment, 'patientUsername', 'postman_patient_local');
  upsertEnvironmentValue(environment, 'patientFirstName', 'Postman');
  upsertEnvironmentValue(environment, 'patientLastName', 'Patient');
  upsertEnvironmentValue(environment, 'seedPatientEmail', 'seed.patient2@pulsewise.local');
  upsertEnvironmentValue(environment, 'mlDate', '2026-04-24');
  upsertEnvironmentValue(environment, 'mlAssessmentId', '');

  writeJson(mainCollectionPath, mainCollection);
  writeJson(smokeCollectionPath, smokeCollection);
  writeJson(environmentPath, environment);
}

main();
