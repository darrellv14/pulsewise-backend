# Django to PulseWise Parity Checklist

Tujuan dokumen ini: memastikan backend Node PulseWise memiliki data dan proses klinis setara dengan backend/dashboard Django referensi, tanpa membuang Chart.js terlalu cepat.

## 1. Keputusan Transisi

- Django + Chart.js tetap aktif sebagai baseline pembanding sampai parity ditandatangani.
- Node PulseWise adalah target final backend untuk konsumsi mobile app.
- Integrasi Django ke PulseWise bersifat transisional (fallback), bukan arsitektur final.

## 2. Field-Level Parity (Wajib)

Checklist field yang harus tersedia dan konsisten makna klinisnya:

- [x] `timestamp` / `measuredAt` (timezone konsisten, ISO 8601).
- [x] `systolicBp`.
- [x] `diastolicBp`.
- [x] `heartRate`.
- [x] `oxygenSaturation`.
- [x] `weight`.
- [x] `height`.
- [x] `bmi`.
- [x] `age` (dihitung dari `dateOfBirth` dengan rule yang konsisten).
- [x] `latestVitals` (snapshot paling akhir lintas sumber metrik).
- [x] `thresholds` (seluruh konstanta evaluasi klinis).
- [x] `abnormalInstances` (event anomali + penjelasan detail).

## 3. Endpoint Parity (Wajib)

- [x] List pasien dashboard
  - Endpoint: `GET /api/v1/doctors/{doctorId}/dashboard/patients`
  - Validasi: list item berisi identity + latest vital minimum.

- [x] Summary pasien
  - Endpoint: `GET /api/v1/doctors/{doctorId}/dashboard/patients/{patientId}`
  - Validasi: `patient`, `latestVitals`, `thresholds`.

- [x] Vitals series
  - Endpoint: `GET /api/v1/doctors/{doctorId}/dashboard/patients/{patientId}/vitals`
  - Validasi: `series.timestamps`, seluruh seri metrik, `latestVitals`.

- [x] Abnormal report
  - Endpoint: `GET /api/v1/doctors/{doctorId}/dashboard/patients/{patientId}/abnormal-report`
  - Validasi: `stats`, `abnormalInstances`, `thresholds`.

## 4. Process-Level Parity (Wajib)

- [x] Rule klasifikasi tekanan darah:
  - Elevated
  - Stage 1 Hypertension
  - Stage 2 Hypertension

- [x] Rule kejanggalan heart rate (di luar normal range).
- [x] Rule kejanggalan oxygen saturation (caution vs dangerous).
- [x] Rule kejanggalan perubahan berat harian signifikan.
- [x] Rule latest snapshot menentukan waktu baca paling mutakhir secara benar.

## 5. Acceptance Criteria Parity

Parity dianggap lulus hanya jika semua kondisi ini terpenuhi:

- [x] Untuk dataset uji yang sama, payload Node vs Django setara secara makna klinis.
- [x] Selisih nilai numerik untuk metrik utama = 0 (atau toleransi yang disepakati jika ada normalisasi).
- [x] Tidak ada field kritikal hilang pada endpoint dashboard.
- [x] Label anomali klinis yang dihasilkan tidak berubah klasifikasinya.
- [x] Smoke test auth guard (`401` invalid/expired token) lolos di endpoint dashboard.

### Toleransi Numerik Yang Dipakai

- Source of truth: `docs/parity/parity-tolerance.json`
- Eksekusi operasional: `docs/PARITY_EXECUTION_RUNBOOK.md`

## 6. Status Implementasi Saat Ini (PulseWise)

- [x] Contract dashboard endpoint sudah tersedia dan terdokumentasi.
- [x] `latestVitals`, `thresholds`, dan `abnormalInstances` sudah ada di flow dashboard.
- [x] Guard test unauthorized/forbidden/invalid payload sudah ada.
- [x] Guard test token invalid/expired untuk dashboard endpoint sudah ada.
- [x] Script capture golden dataset + parity compare otomatis tersedia (`scripts/legacy/dashboard-parity.js`).
- [x] Toleransi numerik parity terdokumentasi eksplisit.
- [x] Snapshot parity otomatis Django vs Node (golden dataset) sudah final (hasil terbaru: pass).

## 7. Aturan Cutover

Jangan mematikan dependency Django/Chart.js sebelum semua checklist bagian 2-5 selesai.
