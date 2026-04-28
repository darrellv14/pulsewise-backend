# Frontend Live Integration Guide

Dokumen ini adalah panduan implementasi frontend untuk environment live PulseWise:

- API utama: `https://api.darrellvalentino.com/api/v1`
- ML debug/admin: `https://ml.darrellvalentino.com`

Frontend web dan mobile **cukup memanggil `api.darrellvalentino.com`**. Service ML tetap dipanggil oleh backend Express.

## 1. Arsitektur Yang Dipakai Frontend

Alur request:

1. Frontend memanggil `api.darrellvalentino.com`
2. Backend Express melakukan auth, validasi role, dan ambil data dari PostgreSQL
3. Jika request butuh ML, backend Express membentuk payload 67 field
4. Backend Express memanggil `ml.darrellvalentino.com`
5. Hasil dikembalikan ke frontend melalui response backend Express

Implikasinya:

- frontend tidak perlu tahu payload 67 field internal model
- frontend tidak perlu menyimpan URL ML sebagai primary base URL
- token auth cukup satu sistem, yaitu token dari backend Express

## 2. Base URL Frontend

Gunakan salah satu bentuk berikut sesuai stack frontend:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.darrellvalentino.com/api/v1
```

```env
VITE_API_BASE_URL=https://api.darrellvalentino.com/api/v1
```

```env
REACT_APP_API_BASE_URL=https://api.darrellvalentino.com/api/v1
```

Jangan:

- hardcode IP VPS `168.144.44.43`
- call `ml.darrellvalentino.com` langsung dari aplikasi utama

## 3. Endpoint Yang Dipakai Frontend

### Auth

- `POST /auth/login`
- `GET /auth/me`

### Dashboard dokter

- `GET /doctors/{doctorId}/dashboard/patients`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/vitals`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/abnormal-report`

### Patient ML flow

- `GET /users/{userId}/ml-readiness`
- `GET /users/{userId}/ml-payload`
- `POST /users/{userId}/ml-predictions`
- `POST /users/{userId}/ml-recommendations`

### Doctor dashboard ML flow

- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/ml-readiness`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/ml-payload`
- `POST /doctors/{doctorId}/dashboard/patients/{patientId}/ml-predictions`
- `POST /doctors/{doctorId}/dashboard/patients/{patientId}/ml-recommendations`

### ML data preparation endpoints

- `GET /patients/{patientId}/ml-profile`
- `PUT /patients/{patientId}/ml-profile`
- `GET /patients/{patientId}/ml-assessments/latest`
- `GET /patients/{patientId}/ml-assessments`
- `POST /patients/{patientId}/ml-assessments`
- `PUT /patients/{patientId}/ml-assessments/{assessmentId}`
- `GET /users/{userId}/diaries/by-date/sleep`
- `PUT /users/{userId}/diaries/by-date/sleep`

## 4. Field Baru Yang Perlu Diakomodasi Frontend

Endpoint lama tetap additive, jadi payload lama tidak dipecah. Tetapi frontend yang ingin menyiapkan pasien agar `ML-ready` perlu mengirim field baru berikut.

### Activity diary

Tambahan field pada `POST /users/{userId}/diaries/by-date/activities`:

- `activityCategory`
- `intensityLevel`
- `transportMode`
- `outdoorMinutes`

Contoh:

```json
{
  "diaryDate": "2026-04-24",
  "name": "Bike commute",
  "activityCategory": "transport",
  "transportMode": "bicycle",
  "intensityLevel": "moderate",
  "duration": 20,
  "heartRate": 104,
  "outdoorMinutes": 20
}
```

Catatan:

- Gunakan enum resmi untuk `activityCategory`, `intensityLevel`, dan `transportMode`
- Lihat detail contract di `docs/frontend/FRONTEND_ACTIVITY_CONTRACT_SHEET.md`

### Symptom diary

Tambahan field pada `POST /users/{userId}/diaries/by-date/symptoms`:

- `symptomCode`
- `bodyArea`
- `isChestPain`
- `painFrequencyCode`
- `painLocationCode`

Contoh:

```json
{
  "diaryDate": "2026-04-24",
  "time": "09:00",
  "symptomName": "Chest discomfort",
  "symptomCode": "chest_pain",
  "bodyArea": "chest",
  "isChestPain": true,
  "painFrequencyCode": 2,
  "painLocationCode": 1,
  "intensity": 3
}
```

Catatan:

- Gunakan enum resmi untuk `symptomCode`, `bodyArea`, `painFrequencyCode`, dan `painLocationCode`
- Jika `symptomCode = "chest_pain"`, frontend wajib mengirim:
  - `bodyArea = "chest"`
  - `isChestPain = true`
  - `painFrequencyCode`
  - `painLocationCode`
- Lihat detail contract di `docs/frontend/FRONTEND_SYMPTOM_CONTRACT_SHEET.md`

### Consumption diary

Tambahan field pada `POST /users/{userId}/diaries/by-date/consumptions`:

- `portionGrams`
- `fdcFoodId`
- `nutritionSource`
- `energyKcal`
- `proteinG`
- `carbohydrateG`
- `sugarG`
- `fiberG`
- `totalFatG`
- `saturatedFatG`
- `monounsaturatedFatG`
- `polyunsaturatedFatG`
- `cholesterolMg`
- `calciumMg`

Contoh:

```json
{
  "diaryDate": "2026-04-24",
  "time": "12:00",
  "type": "meal",
  "name": "Balanced lunch",
  "portion": "1 plate",
  "portionGrams": 350,
  "nutritionSource": "manual_snapshot",
  "energyKcal": 650,
  "proteinG": 35,
  "carbohydrateG": 70,
  "sugarG": 12,
  "fiberG": 9,
  "totalFatG": 20,
  "saturatedFatG": 6,
  "monounsaturatedFatG": 7,
  "polyunsaturatedFatG": 5,
  "cholesterolMg": 120,
  "calciumMg": 300
}
```

### Sleep diary

Endpoint baru:

- `PUT /users/{userId}/diaries/by-date/sleep`

Contoh:

```json
{
  "diaryDate": "2026-04-24",
  "sleepTime": "22:30",
  "wakeTime": "06:30",
  "sleepDurationHours": 8,
  "source": "mobile_manual"
}
```

### ML profile

Endpoint:

- `PUT /patients/{patientId}/ml-profile`

Contoh:

```json
{
  "demog1_riagendr": 1,
  "demog1_ridreth3": 6,
  "demog1_dmdeduc": 4,
  "demog1_dmdfmsiz": 3,
  "demog1_dmdhhsiz": 3,
  "demog1_dmdhhsza": 2,
  "demog1_dmdhhszb": 1,
  "demog1_dmdhhsze": 0,
  "demog1_dmdmartl": 1,
  "quest22_smq020": 1,
  "quest22_smq890": 1,
  "quest22_smq900": 2,
  "quest23_smd470": 0,
  "quest1_alq111": 2
}
```

### ML assessment

Endpoint:

- `POST /patients/{patientId}/ml-assessments`
- `PUT /patients/{patientId}/ml-assessments/{assessmentId}`

Field assessment memang coded dan banyak, jadi frontend sebaiknya membuat form section atau wizard terpisah, bukan mencampurnya ke profile utama.

## 5. Alur Agar Pasien Menjadi ML-Ready

Urutan paling aman untuk frontend:

1. Login patient atau doctor
2. Isi `patient profile` dan body metrics dasar
3. Isi `ml-profile`
4. Isi `ml-assessments`
5. Isi `sleep diary`
6. Isi `activity` dengan category/intensity
7. Isi `consumption` dengan nutrient snapshot
8. Cek `GET /users/{userId}/ml-readiness`
9. Jika `ready = true`, baru panggil prediction/recommendation

## 6. Cara Membaca Response ML

### Readiness

Response utama:

- `ready`
- `missingFields`
- `resolvedFields`
- `window`
- `sourceSummary`

Frontend sebaiknya:

- tampilkan `ready` sebagai status utama
- tampilkan `missingFields` untuk membantu user melengkapi data
- jangan panggil prediction/recommendation saat `ready = false`

### Prediction

Response utama:

- `mlVersion`
- `window`
- `payloadHash`
- `sourceSummary`
- `upstream`

Hasil prediksi model ada di `data.upstream.body.result`.

### Recommendation

Response utama:

- `mlVersion`
- `window`
- `payloadHash`
- `sourceSummary`
- `upstream`

Isi rekomendasi model ada di `data.upstream.body.recommendationResult`.

## 7. Status Error Yang Harus Ditangani Frontend

- `401`: token tidak valid / belum login
- `403`: role tidak sesuai atau akses lintas scope
- `404`: entity tidak ditemukan
- `409`: `ML_NOT_READY`
- `422`: payload validasi gagal
- `500`: server error
- `502`: upstream ML error
- `503` / `504`: service ML timeout / unavailable

## 8. Seed Account QA Saat Ini

- Patient: `seed.patient2@pulsewise.local` / `dev12345`
- Doctor: `doctor@pulsewise.local` / `dev12345`

Ini untuk QA dan smoke test, bukan akun end user production.

## 9. Referensi Implementasi

- `docs/frontend/FRONTEND_PRODUCTION_HANDOFF.md`
- `docs/frontend/FRONTEND_ACTIVITY_CONTRACT_SHEET.md`
- `docs/frontend/FRONTEND_SYMPTOM_CONTRACT_SHEET.md`
- `docs/frontend/FRONTEND_INTEGRATION_GUIDE.md`
- `docs/architecture/ML_HFMS_V3_BLUEPRINT.md`
- `postman/PulseWise-API.postman_collection.json`
- `postman/PulseWise-Dashboard-Smoke.postman_collection.json`
- `postman/environments/PulseWise-Production.postman_environment.json`
