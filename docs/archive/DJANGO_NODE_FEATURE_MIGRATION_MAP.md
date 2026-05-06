# Django to Node Feature Migration Map

Dokumen ini menjelaskan fitur Django yang sudah memiliki pengganti di PulseWise Node, serta apa yang bisa dihapus bertahap.

## 1. Fitur Django yang Sudah Diganti ke Node

### A. Dashboard Patient List

- Django compatibility: `GET /api/list-patients/`
- Node replacement: `GET /doctors/{doctorId}/dashboard/patients`
- Status: parity lulus, siap dipakai sebagai source utama read path.

### B. Dashboard Patient Summary

- Django compatibility: bagian summary dari `GET /{patientId}/json/`
- Node replacement: `GET /doctors/{doctorId}/dashboard/patients/{patientId}`
- Status: parity lulus termasuk `age`, `latestVitals`, `thresholds`.

### C. Dashboard Vitals Series

- Django compatibility: bagian vitals/chart dari `GET /{patientId}/json/`
- Node replacement: `GET /doctors/{doctorId}/dashboard/patients/{patientId}/vitals`
- Status: parity lulus untuk series metrik kritikal.

### D. Dashboard Abnormal Report

- Django compatibility: `GET /api/{patientId}/generate-abnormal-report/`
- Node replacement: `GET /doctors/{doctorId}/dashboard/patients/{patientId}/abnormal-report`
- Status: parity lulus pada `stats`, `abnormalInstances`, `thresholds`.

### E. Dashboard Pairing (QR Session)

- Django pattern lama: pairing non-standar / custom flow (bervariasi implementasi).
- Node replacement:
  - `POST /doctors/{doctorId}/dashboard/pairing-sessions`
  - `GET /doctors/{doctorId}/dashboard/pairing-sessions/{pairingSessionId}`
  - `GET /doctors/{doctorId}/dashboard/pairing-sessions/{pairingSessionId}/events`
  - `POST /dashboard/pairing-sessions/confirm`
- Status: tersedia + idempotent final response (`200/201`).

## 2. Yang Bisa Dihapus Sekarang (Aman di Tahap 1)

- Query langsung Django ke source data lama (MongoDB/legacy table) untuk:
  - list pasien dashboard,
  - detail/summary pasien,
  - vitals chart,
  - abnormal report.
- Utility query/serializer Django yang hanya dipakai untuk akses data lokal lama pada 4 fitur di atas.

Catatan: route compatibility endpoint Django belum dihapus pada Tahap 1, hanya source datanya dipaksa lewat Node.

## 3. Yang Bisa Dihapus Setelah Soft Deprecation Lolos

- Handler compatibility endpoint Django berikut:
  - `GET /api/list-patients/`
  - `GET /api/{patientId}/json/`
  - `GET /api/{patientId}/generate-abnormal-report/`
- Adapter response khusus yang hanya ada untuk menjaga backward compatibility endpoint di atas.

Prasyarat:

- Traffic endpoint compatibility nol dalam monitoring window.
- Smoke test E2E stabil.

## 4. Yang Jangan Dihapus Dulu

- Template Chart.js Django (selama masa transisi observability belum selesai).
- Mekanisme login/session Django web sampai integrasi auth transisional benar-benar stabil.
- Fallback operasional yang diperlukan selama rollback window masih aktif.

## 5. Source of Truth

- Matrix tahapan: `docs/DJANGO_DEPRECATION_MATRIX.md`
- Tracker eksekusi: `docs/DJANGO_CUTOVER_EXECUTION_TRACKER.md`
- Checklist parity: `docs/DJANGO_PULSEWISE_PARITY_CHECKLIST.md`
- Artefak parity report: `docs/parity/parity-report.json`
