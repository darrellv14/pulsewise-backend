# Second ML FE Handoff

Dokumen ini adalah acuan frontend untuk integrasi **second ML** PulseWise (`heart_disease_v1`).

## Ringkasan

- Model key: `heart_disease_v1`
- ML version default saat ini: `heart-risk-v1` (dapat dikonfigurasi via env)
- Bentuk model: **second opinion** untuk prediksi risiko heart disease
- Frontend **tetap hanya memanggil backend Express**, bukan service ML Python langsung

## Endpoint Patient

- `GET /users/{userId}/heart-risk-model/readiness`
- `GET /users/{userId}/heart-risk-model/assessment/latest`
- `GET /users/{userId}/heart-risk-model/assessments`
- `POST /users/{userId}/heart-risk-model/assessments`
- `PUT /users/{userId}/heart-risk-model/assessments/{assessmentId}`
- `POST /users/{userId}/heart-risk-model/predictions`
- `GET /users/{userId}/heart-risk-model/predictions/latest`
- `GET /users/{userId}/heart-risk-model/predictions/history`
- `GET /users/{userId}/heart-risk-model/predictions/history/{resultId}`

## Endpoint Doctor Dashboard

- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/heart-risk-model/readiness`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/heart-risk-model/assessment/latest`
- `POST /doctors/{doctorId}/dashboard/patients/{patientId}/heart-risk-model/predictions`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/heart-risk-model/predictions/latest`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/heart-risk-model/predictions/history`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/heart-risk-model/predictions/history/{resultId}`

## Kontrak Assessment Final

Second ML sekarang **fix memakai 9 fitur** berikut:

1. `age`
2. `sex`
3. `chest_pain_type`
4. `resting_bp_s`
5. `fasting_blood_sugar`
6. `max_heart_rate`
7. `exercise_angina`
8. `old_peak`
9. `st_slope`

Contoh body create/update assessment:

```json
{
  "assessmentDate": "2026-06-01",
  "age": 58,
  "sex": 0,
  "chest_pain_type": 3,
  "resting_bp_s": 151,
  "fasting_blood_sugar": 0,
  "max_heart_rate": 118,
  "exercise_angina": 0,
  "old_peak": 0,
  "st_slope": 2
}
```

## Flow FE Yang Benar

1. simpan assessment 9 fitur
2. hit readiness
3. kalau `ready = true`, baru hit prediction
4. tampilkan latest/history dari hasil yang sudah dipersist

## Bentuk Response Penting

### Readiness

```json
{
  "success": true,
  "message": "Status readiness second ML pasien berhasil diambil",
  "data": {
    "ready": true,
    "modelKey": "heart_disease_v1",
    "missingFields": [],
    "resolvedFields": [
      "age",
      "sex",
      "chest_pain_type",
      "resting_bp_s",
      "fasting_blood_sugar",
      "max_heart_rate",
      "exercise_angina",
      "old_peak",
      "st_slope"
    ],
    "sourceSummary": {
      "assessmentId": "uuid",
      "assessmentDate": "2026-06-01",
      "derived": {
        "ageFromProfile": false,
        "sexFromProfile": false,
        "restingBpFromBodyMetric": false,
        "maxHeartRateFromBodyMetric": false
      },
      "latestBodyMetricMeasuredAt": null
    }
  }
}
```

### Prediction

`POST /users/{userId}/heart-risk-model/predictions?includePayload=false`

```json
{
  "success": true,
  "message": "Prediksi second ML pasien berhasil diambil",
  "data": {
    "resultId": "uuid",
    "generatedAt": "2026-06-01T20:44:49.371Z",
    "modelKey": "heart_disease_v1",
    "mlVersion": "heart-risk-v1",
    "payloadHash": "hash",
    "sourceSummary": {
      "assessmentId": "uuid",
      "assessmentDate": "2026-06-01"
    },
    "upstream": {
      "endpoint": "/predictions",
      "status": 200,
      "body": {
        "featureOrder": [
          "age",
          "sex",
          "chest_pain_type",
          "resting_bp_s",
          "fasting_blood_sugar",
          "max_heart_rate",
          "exercise_angina",
          "old_peak",
          "st_slope"
        ],
        "mlVersion": "heart-risk-v1",
        "modelKey": "heart_disease_v1",
        "predictedClass": 0,
        "probability": 0.3695482015609741,
        "riskLevel": "low",
        "threshold": 0.43
      }
    }
  }
}
```

### Latest / Detail History

Frontend bisa ambil hasil persist lewat:

- `GET .../predictions/latest`
- `GET .../predictions/history`
- `GET .../predictions/history/{resultId}`

Field penting yang stabil:

- `resultId`
- `modelKey`
- `mlVersion`
- `inferenceType`
- `requestContext`
- `generatedAt`
- `upstream.body.predictedClass`
- `upstream.body.probability`
- `upstream.body.riskLevel`
- `upstream.body.threshold`

## Error Handling

- `401` token invalid / belum login
- `403` tidak punya scope ke user/patient
- `404` assessment atau history detail tidak ditemukan
- `409` readiness belum lengkap
- `422` validasi payload gagal
- `502` upstream second-ML error
- `503` / `504` second-ML timeout atau unavailable

## Catatan Implementasi FE

- `predictedClass = 0` bukan error; itu hasil model
- `probability` adalah angka utama untuk UI
- `riskLevel` sekarang berasal dari threshold backend:
  - `<= 0.43` -> `low`
  - `<= 0.80` -> `medium`
  - `> 0.80` -> `high`
- FE tidak perlu hit service Python langsung

## Referensi

- `docs/api/openapi.yaml`
- `docs/architecture/SECOND_ML_INTEGRATION_GUIDE.md`
- `services/heart-risk-ml-service/README.md`
