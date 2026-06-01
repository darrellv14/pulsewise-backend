# Second ML Integration Guide

Panduan ini menjadi acuan implementasi dan integrasi machine learning kedua di PulseWise sebagai pendamping HFMS ML.

Referensi model kedua saat ini:

- sumber repo: `https://github.com/icedmuffin/flask-project1/tree/heart-prediction-testing2`
- jenis repo: Flask web app lama
- fokus model: prediksi risiko `heart disease`

Dokumen ini sengaja membedakan antara:

- `HFMS ML` sebagai model utama yang sudah terintegrasi
- `Second ML` sebagai model pendamping atau `second opinion`

## 1. Tujuan Integrasi

Tujuan integrasi bukan untuk menggantikan HFMS, melainkan menambahkan satu model prediksi klinis kedua yang dapat:

- memberi prediksi risiko `heart disease` berbasis input klinis spesifik
- ditampilkan berdampingan dengan hasil HFMS
- menjadi pembanding akademik dan produk
- tetap disimpan dalam histori inference backend

Posisi produk yang direkomendasikan:

- `HFMS ML`: model utama, longitudinal, komprehensif
- `Second ML`: model pendamping, point-in-time, berbasis asesmen klinis singkat

## 2. Ringkasan Perbedaan HFMS dan Second ML

### HFMS ML

- sumber data: profil pasien, ML profile, ML assessment, diary, nutrisi, biometrik, sleep, aktivitas
- sifat analisis: longitudinal
- output: prediksi dan rekomendasi
- status integrasi: sudah hidup di PulseWise

### Second ML

- sumber data: input klinis spesifik dari satu kali asesmen
- sifat analisis: point-in-time
- output: prediksi risiko saja
- status integrasi: belum ada, masih perlu distandardisasi

## 3. Temuan Penting dari Repo Flask Lama

Repo yang diberikan bukan microservice inference yang siap dipasang langsung ke production. Dari pembacaan codebase:

- repo masih berupa Flask web app dengan template HTML
- model prediction tercampur dengan expert system berbasis Prolog
- route prediction di `app.py` saat ini memakai 9 fitur input
- sample input lama pernah beredar memakai 11 fitur
- ada mismatch kontrak antara sample lama dan implementasi runtime
- pemanggilan model memakai `joblib.load('model.pkl')`
- route prediction memakai `predict(...)`, bukan kontrak probabilitas yang eksplisit

Hasil verifikasi artefak `model.pkl` menunjukkan bahwa model yang benar-benar dipakai runtime adalah pipeline 9 fitur:

- `age`
- `sex`
- `chest_pain_type`
- `resting_bp_s`
- `fasting_blood_sugar`
- `max_heart_rate`
- `exercise_angina`
- `old_peak`
- `st_slope`

Field `cholesterol` dan `resting_ecg` muncul di sample input lama, tetapi tidak termasuk ke feature order di artefak model yang berhasil diinspeksi. Karena itu, kedua field tersebut tidak dipakai di kontrak final PulseWise.

Maka keputusan implementasi yang disarankan:

1. jangan integrasikan repo Flask itu mentah-mentah
2. ekstrak bagian model prediction saja
3. bungkus sebagai microservice inference kedua yang bersih
4. expert system ditunda ke fase terpisah

## 4. Kontrak Fitur yang Harus Diverifikasi Dulu

Sebelum coding integrasi, tim harus memastikan kontrak model kedua yang sebenarnya:

1. model artefak lokal terverifikasi menerima 9 fitur, sedangkan sample lama masih menunjukkan 11 fitur
2. urutan fitur final persis seperti apa
3. apakah output model adalah probability atau class
4. apakah threshold `0.43` memang keputusan final
5. `cholesterol` dan `resting_ecg` tidak masuk kontrak final second ML di PulseWise kecuali nanti ada artefak model baru yang membuktikan sebaliknya

Sampai kontrak ini pasti, backend PulseWise tidak boleh mengklaim input final sebagai canon.

## 5. Ketersediaan Data di PulseWise Saat Ini

Dari sisi PulseWise sekarang, beberapa field bisa diturunkan, tetapi sebagian besar field model kedua belum punya rumah data yang cukup rapi.

### Relatif tersedia atau bisa diturunkan

- `age`
- `sex`
- `resting_bp_s`
- `max_heart_rate`

### Perlu diinput manual atau belum siap penuh

- `chest_pain_type`
- `fasting_blood_sugar`
- `exercise_angina`
- `old_peak`
- `st_slope`

Implikasinya:

Second ML tidak boleh dipaksa membaca otomatis dari data PulseWise yang ada sekarang. Kita butuh satu asesmen khusus supaya input model kedua lengkap dan jujur.

## 6. Arsitektur Integrasi yang Direkomendasikan

### Prinsip inti

- HFMS tetap dibiarkan apa adanya
- Second ML dibuat sebagai microservice terpisah
- PulseWise backend menjadi orchestration layer yang memanggil dua model berbeda
- history inference tetap masuk ke backend utama

### Layout implementasi saat ini

Second ML service sekarang sudah bisa diletakkan sebagai folder deployable di dalam repo ini:

```text
pulsewise-backend/
  services/
    heart-risk-ml-service/
```

### Layout target jangka menengah yang tetap direkomendasikan

```text
Downloads/
  pulsewise-backend/
  hfms-backend/
  pulsewise-heart-risk-backend/
```

### Tanggung jawab masing-masing

#### `pulsewise-backend`

- menyimpan data pasien
- menyimpan data assessment second ML
- menghitung readiness
- memanggil second ML service
- menyimpan histori hasil inference

#### `pulsewise-heart-risk-backend`

- menerima input fitur model kedua
- memuat model yang sudah distandardisasi
- mengembalikan prediction result yang konsisten
- tidak menangani user auth atau domain PulseWise

## 7. Desain Data yang Direkomendasikan

Karena input model kedua tidak sama dengan HFMS, sebaiknya dibuat tabel assessment baru.

### Model baru yang disarankan

`PatientHeartRiskAssessment`

Field minimum yang direkomendasikan:

- `assessmentId`
- `patientId`
- `assessmentDate`
- `age`
- `sex`
- `chestPainType`
- `restingBpS`
- `fastingBloodSugar`
- `maxHeartRate`
- `exerciseAngina`
- `oldPeak`
- `stSlope`
- `createdAt`
- `updatedAt`

### Kenapa perlu tabel baru

- kontrak data second ML berbeda dari HFMS
- field-fieldnya lebih cocok dianggap snapshot asesmen klinis
- menghindari logika inferensi liar dari data diary yang belum tentu cocok

## 8. Desain Histori Inference yang Direkomendasikan

Saat ini histori inference ML di PulseWise dibedakan terutama oleh:

- `inferenceType`
- `requestContext`
- `mlVersion`

Untuk second ML, ini belum cukup aman karena dua model berbeda bisa sama-sama menghasilkan `prediction`.

### Rekomendasi

Tambahkan `modelKey` pada histori inference, misalnya:

- `hfms`
- `heart_disease_v1`

Contoh kebutuhan perubahan:

- field baru: `modelKey varchar(64) not null`
- default existing: `hfms`
- index baru: `(patientId, modelKey, inferenceType, generatedAt desc)`

Dengan begitu:

- histori HFMS dan second ML tidak tercampur
- FE bisa filter hasil model per jenis dengan jelas

## 9. API PulseWise yang Direkomendasikan

Jangan menumpangkan second ML ke route HFMS yang sekarang. Lebih aman diberi family route sendiri.

### Patient endpoints

- `GET /users/:userId/heart-risk-model/readiness`
- `GET /users/:userId/heart-risk-model/assessment/latest`
- `GET /users/:userId/heart-risk-model/assessments`
- `POST /users/:userId/heart-risk-model/assessments`
- `PUT /users/:userId/heart-risk-model/assessments/:assessmentId`
- `POST /users/:userId/heart-risk-model/predictions`
- `GET /users/:userId/heart-risk-model/predictions/latest`
- `GET /users/:userId/heart-risk-model/predictions/history`
- `GET /users/:userId/heart-risk-model/predictions/history/:resultId`

### Doctor dashboard endpoints

- `GET /doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/readiness`
- `GET /doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/assessment/latest`
- `GET /doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/predictions/latest`
- `GET /doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/predictions/history`
- `POST /doctors/:doctorId/dashboard/patients/:patientId/heart-risk-model/predictions`

## 10. Kontrak Response yang Direkomendasikan

### Readiness

```json
{
  "ready": false,
  "modelKey": "heart_disease_v1",
  "missingFields": [
    "chest_pain_type",
    "fasting_blood_sugar",
    "exercise_angina",
    "old_peak",
    "st_slope"
  ],
  "resolvedFields": [
    "age",
    "sex",
    "resting_bp_s",
    "max_heart_rate"
  ]
}
```

### Prediction

```json
{
  "modelKey": "heart_disease_v1",
  "mlVersion": "heart-risk-v1",
  "payloadHash": "sha256:...",
  "prediction": {
    "predictedClass": 1,
    "probability": 0.67,
    "riskLevel": "medium",
    "threshold": 0.43
  },
  "sourceSummary": {
    "assessmentId": "uuid"
  }
}
```

## 11. Flow Produk yang Direkomendasikan

### Pasien

1. pasien membuka fitur second ML
2. backend mengecek readiness
3. bila belum lengkap, pasien melengkapi assessment khusus
4. pasien submit prediction
5. hasil ditampilkan sebagai prediksi pendamping

### Dokter

1. dokter membuka dashboard pasien
2. dokter melihat readiness second ML
3. bila data belum lengkap, dokter meminta pasien melengkapi assessment
4. dokter dapat menjalankan prediksi untuk pasien yang terhubung
5. hasil tampil berdampingan dengan HFMS

## 12. Strategi Implementasi Bertahap

### Fase 1 - Standardisasi model kedua

- verifikasi kontrak fitur final
- verifikasi bentuk output model
- pisahkan prediction dari expert system
- buat service `pulsewise-heart-risk-backend`

### Fase 2 - Integrasi backend PulseWise

- tambah assessment model baru
- tambah `modelKey` pada inference history
- tambah route readiness, assessment, prediction, latest, history
- tambah orchestration layer kedua

### Fase 3 - Integrasi frontend

- form assessment second ML
- state readiness
- result card terpisah dari HFMS
- history per model

### Fase 4 - Hardening

- observability
- retry/error handling
- smoke test production
- contract testing

## 13. Apakah Repo Flask Lama Perlu Update Dependencies

Jawaban singkat: `ya, perlu`, tetapi tidak boleh dilakukan secara membabi buta sebelum parity output diamankan.

### Kenapa tetap perlu update

Repo itu sudah berumur beberapa tahun dan memakai stack lama, misalnya:

- `tensorflow==2.12.0`
- `scikit-learn==1.2.2`
- `joblib==1.2.0`
- `flask==2.3.2`
- `werkzeug==2.3.6`
- `pyswip==0.2.10`

Risiko jika langsung dipakai apa adanya:

- image build bisa rapuh
- dependency bisa sulit dijalankan di environment baru
- model loading bisa gagal saat base runtime berubah
- security patch tertinggal
- coupling ke expert system memperberat maintenance

### Tapi kenapa tidak boleh langsung upgrade semua

Karena model lama bisa sangat sensitif terhadap:

- versi TensorFlow
- versi NumPy
- format serialisasi model
- perilaku `joblib` atau scikit-learn

Kalau semua dependency langsung dinaikkan tanpa baseline:

- model bisa gagal load
- output model bisa berubah
- kita tidak punya bukti apakah perubahan karena upgrade atau karena bug integrasi

## 14. Strategi Dependency yang Direkomendasikan

### Tahap A - Compatibility Freeze

Tujuan: membuat model lama bisa dijalankan dulu secara reproducible.

Lakukan:

- pertahankan pin dependency lama untuk service isolasi awal
- buat endpoint health dan prediction minimal
- siapkan golden test input-output
- pastikan output service stabil

Ini dipakai sebagai baseline.

### Tahap B - Controlled Upgrade

Tujuan: menurunkan risiko operasional tanpa merusak perilaku model.

Lakukan bertahap:

1. upgrade dependency non-model lebih dulu jika aman
2. pisahkan expert system dari prediction service
3. verifikasi model loading pada runtime baru
4. bandingkan output terhadap golden cases
5. hanya terima upgrade jika hasil parity masih masuk toleransi

### Rekomendasi praktis

Untuk integrasi PulseWise, pendekatan paling aman adalah:

- jangan upgrade repo lama di tempat
- buat repo service baru yang bersih
- bawa model artifact dan kontrak input-output ke repo baru
- freeze dependency sampai prediction parity lolos
- baru harden dependency satu per satu

## 15. Keputusan yang Direkomendasikan untuk Tim

1. HFMS tetap menjadi ML utama
2. second ML diintegrasikan sebagai `secondary risk model`
3. repo Flask lama tidak dipakai mentah sebagai production service
4. prediction dipisahkan dari expert system
5. input second ML memakai assessment khusus
6. histori inference dibedakan dengan `modelKey`
7. dependency repo lama di-freeze dulu untuk compatibility, lalu di-upgrade bertahap setelah parity terjaga

## 16. Checklist Eksekusi

### Discovery

- [ ] pastikan kontrak fitur final 9 atau 11
- [ ] pastikan output model probability atau class
- [ ] pastikan threshold final

### Data model

- [ ] desain `PatientHeartRiskAssessment`
- [ ] tambah `modelKey` pada inference history

### Service

- [ ] buat `pulsewise-heart-risk-backend`
- [ ] buat `/health`
- [ ] buat `/v1/metadata`
- [ ] buat `/v1/predictions`

### PulseWise backend

- [ ] tambah readiness service second ML
- [ ] tambah assessment CRUD second ML
- [ ] tambah prediction/latest/history routes
- [ ] tambah doctor dashboard access path

### FE

- [ ] tambah form assessment second ML
- [ ] tambah tampilan readiness
- [ ] tambah card hasil second ML
- [ ] tambah history hasil second ML

### Hardening

- [ ] siapkan golden test cases
- [ ] smoke test staging
- [ ] smoke test production
- [ ] observability dan logging error inference
