# ML HFMS v3 Blueprint

## Ringkasan

Dokumen ini menjadi source of truth integrasi penuh PulseWise backend dengan `hfms-backend v3`.

Target implementasi:

- Mendukung seluruh 67 field input model HFMS v3.
- Tidak melakukan silent zero-filling untuk field yang belum tersedia.
- Menjaga kontrak endpoint existing tetap hidup untuk mobile app dan dashboard dokter.
- Menambahkan lapisan ML-specific yang terpisah dari endpoint domain biasa.
- Menempatkan repo `hfms-backend` sebagai sibling repo di luar `pulsewise-backend`.

## Keputusan Arsitektur

- Envelope response backend tetap `success`, `message`, `data`.
- Endpoint existing hanya boleh berubah secara additive.
- Endpoint dashboard dokter existing tidak diubah menjadi flat payload ML.
- Field coded ML/NHANES disimpan dengan nama coded yang sama agar tidak ada translasi ganda.
- Nutrient snapshot harus sudah persisted sebelum request prediction/recommendation.
- Endpoint generation ML hanya boleh berjalan saat pasien berstatus `ML-ready`.
- Jika data belum lengkap, endpoint ML mengembalikan `409` dengan detail `ML_NOT_READY`.

## Sibling Repo Layout

Workspace yang dipakai untuk pengembangan lokal:

```text
Downloads/
  pulsewise-backend/
  hfms-backend/
  chf-dashboard/
```

Alasan:

- isolasi dependency Node.js dan Python
- CI/CD terpisah
- deployment microservice lebih bersih
- menghindari nested Git repository

## Model Input HFMS v3

Field model yang harus dipenuhi:

```text
Dieta1_DR1TCALC
Dieta1_DR1TCARB
Dieta1_DR1TCHOL
Dieta1_DR1TFIBE
Dieta1_DR1TKCAL
Dieta1_DR1TMFAT
Dieta1_DR1TPFAT
Dieta1_DR1TPROT
Dieta1_DR1TSFAT
Dieta1_DR1TSUGR
Dieta1_DR1TTFAT
Exami2_BMXBMI
Quest19_PAD615
Quest19_PAD645
Quest19_PAD660
Quest19_PAQ610
Quest19_PAQ635
Quest19_PAQ640
Quest19_PAQ655
Quest21_SLD123
Quest21_SLQ3032
Quest6_DED1225
Demog1_DMDEDUC
Demog1_DMDFMSIZ
Demog1_DMDHHSIZ
Demog1_DMDHHSZA
Demog1_DMDHHSZB
Demog1_DMDHHSZE
Demog1_DMDMARTL
Demog1_RIAGENDR
Demog1_RIDAGEYR
Demog1_RIDRETH3
Exami1_BPXPLS
Exami1_DiaPulse
Exami1_SysPulse
Exami2_BMXHT
Exami2_BMXWT
Labor1_LBDTCSI
Labor2_URDFLOW1
Labor2_URDTIME1
Labor2_URXVOL1
Quest11_HIQ011
Quest12_HEQ010
Quest12_HEQ030
Quest15_KIQ022
Quest15_KIQ026
Quest16_MCQ010
Quest16_MCQ160B
Quest16_MCQ220
Quest16_MCQ300A
Quest16_MCQ300C
Quest17_DPQ020
Quest17_DPQ030
Quest17_DPQ040
Quest1_ALQ111
Quest20_PFQ061B
Quest20_PFQ061C
Quest20_PFQ061H
Quest22_SMQ020
Quest22_SMQ890
Quest22_SMQ900
Quest23_SMD470
Quest3_CDQ008
Quest3_CDQ009
Quest3_CDQ010
Quest7_DIQ010
Quest9_DLQ050
```

## Perubahan Data Model

### Model Baru

1. `PatientMlProfile`
   - satu row per pasien
   - berisi field coded yang relatif stabil

2. `PatientMlAssessment`
   - snapshot per tanggal assessment
   - berisi coded clinical/questionnaire/lab

3. `DailySleepRecord`
   - terhubung ke `HeartDiary`
   - menyimpan `sleepTime`, `wakeTime`, `sleepDurationHours`, `source`

### Perluasan Model Existing

1. `DailyActivity`
   - `activityCategory`
   - `intensityLevel`
   - `transportMode`
   - `outdoorMinutes`

2. `DailySymptom`
   - `symptomCode`
   - `bodyArea`
   - `isChestPain`
   - `painFrequencyCode`
   - `painLocationCode`

3. `DailyConsumption`
   - `portionGrams`
   - `fdcFoodId`
   - `nutritionSource`
   - nutrient snapshot fields

## Source of Truth

- `Demog1_RIDAGEYR` dari `patient_profiles.date_of_birth`
- `Exami2_BMXHT`, `Exami2_BMXWT`, `Exami2_BMXBMI`, `Exami1_SysPulse`, `Exami1_DiaPulse` dari body metric diary terbaru, fallback ke biometrics jika diary kosong
- Diet dari nutrient snapshot `daily_consumptions`
- Sleep dari `daily_sleep_records`
- Activity dari `daily_activities` yang sudah terstruktur
- Questionnaire, comorbidity, lab, dan coded detail dari `patient_ml_profiles` dan `patient_ml_assessments`

## Endpoint Baru

### ML Stable Profile

- `GET /patients/:patientId/ml-profile`
- `PUT /patients/:patientId/ml-profile`

### ML Assessment

- `GET /patients/:patientId/ml-assessments/latest`
- `GET /patients/:patientId/ml-assessments`
- `POST /patients/:patientId/ml-assessments`
- `PUT /patients/:patientId/ml-assessments/:assessmentId`

### Sleep Diary

- `GET /users/:userId/diaries/by-date/sleep?date=YYYY-MM-DD`
- `PUT /users/:userId/diaries/by-date/sleep`

### Patient ML Aggregation

- `GET /users/:userId/ml-readiness`
- `GET /users/:userId/ml-payload`
- `POST /users/:userId/ml-predictions`
- `POST /users/:userId/ml-recommendations`

### Doctor Dashboard ML

- `GET /doctors/:doctorId/dashboard/patients/:patientId/ml-readiness`
- `GET /doctors/:doctorId/dashboard/patients/:patientId/ml-payload`
- `POST /doctors/:doctorId/dashboard/patients/:patientId/ml-predictions`
- `POST /doctors/:doctorId/dashboard/patients/:patientId/ml-recommendations`

## Additive Changes pada Diary Endpoint Existing

- `activities` menerima field klasifikasi aktivitas
- `symptoms` menerima coded symptom detail
- `consumptions` menerima nutrient snapshot

Tidak ada mandatory field baru untuk client lama.

## Kontrak Response ML

### ML Readiness

```json
{
  "ready": true,
  "missingFields": [],
  "resolvedFields": [],
  "window": {
    "startDate": "2026-04-18",
    "endDate": "2026-04-24"
  },
  "sourceSummary": {}
}
```

### ML Payload

```json
{
  "mlVersion": "hfms-v3",
  "window": {
    "startDate": "2026-04-18",
    "endDate": "2026-04-24"
  },
  "payload": {},
  "sourceSummary": {}
}
```

### Prediction / Recommendation

```json
{
  "mlVersion": "hfms-v3",
  "window": {
    "startDate": "2026-04-18",
    "endDate": "2026-04-24"
  },
  "payloadHash": "sha256:...",
  "sourceSummary": {},
  "upstream": {}
}
```

Jika belum siap:

```json
{
  "code": "ML_NOT_READY"
}
```

## Mapping Rules

- Unknown dianggap missing, bukan `0`.
- Window default:
  - activity: rolling 7 hari
  - diet: rolling 7 hari
  - sleep: latest dalam 7 hari
  - body metrics: latest dalam 7 hari
  - assessment/profile: latest snapshot
- `Quest19_PAD615` dari total menit `work + vigorous`
- `Quest19_PAQ610` dari jumlah hari unik `work + vigorous`
- `Quest19_PAD645` dari total menit `transport + walk/bicycle`
- `Quest19_PAQ635` dari ada atau tidak adanya transport walk/bike
- `Quest19_PAQ640` dari jumlah hari unik transport walk/bike
- `Quest19_PAD660` dari total menit `recreation + vigorous`
- `Quest19_PAQ655` dari jumlah hari unik recreation vigorous
- `Quest3_CDQ008` dari chest pain coded event pada window
- `Quest3_CDQ009` dan `Quest3_CDQ010` hanya dari coded detail, bukan inferensi free text
- `Exami1_SysPulse` berasal dari `systolicPressure`
- `Exami1_DiaPulse` berasal dari `diastolicPressure`

## Urutan Implementasi

1. Tambahkan dokumen blueprint ini.
2. Pindahkan repo HFMS menjadi sibling repo dan perbarui workspace.
3. Tambahkan schema dan migration untuk model/field ML baru.
4. Tambahkan endpoint `ml-profile`, `ml-assessments`, dan `sleep`.
5. Extend endpoint diary existing secara additive.
6. Refactor bridge ML menjadi strict readiness.
7. Tambahkan endpoint doctor dashboard khusus ML.
8. Tambahkan test untuk validator, mapper, service, dan contract.

## Catatan Kompatibilitas

- `patient_profiles.sex`, `is_smoking`, dan `is_electric_smoking` tetap dipertahankan untuk backward compatibility.
- Field tersebut tidak otomatis dianggap canonical source untuk ML.
- Dashboard dokter existing harus tetap lolos tanpa field ML baru.
