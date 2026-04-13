# Postman Import Guide (PulseWise)

Tujuan file ini: menghindari kebingungan karena ada beberapa file export lama.

## File Yang Dipakai (Canonical)

Import **hanya** file berikut:

1. Main collection: `postman/PulseWise-API.postman_collection.json`
2. Smoke collection dashboard: `postman/PulseWise-Dashboard-Smoke.postman_collection.json`
3. Environment: `postman/PulseWise-Local.postman_environment.json`

## Langkah Import

1. Buka Postman.
2. Klik **Import**.
3. Import collection main: `postman/PulseWise-API.postman_collection.json`.
4. Import collection smoke: `postman/PulseWise-Dashboard-Smoke.postman_collection.json`.
5. Import environment: `postman/PulseWise-Local.postman_environment.json`.
6. Pilih environment **PulseWise Local** di kanan atas Postman.

## Alur Run Yang Direkomendasikan (Frontend Friendly)

1. Di folder **Auth**, jalankan `POST Login Doctor` dan `POST Login Patient` agar `doctorToken`, `patientToken`, `doctorId`, `patientId` terisi otomatis.
2. Di folder **Care - Doctor Patients**, pakai endpoint utama `POST Link By Scanned Patient ID (Primary QR Flow)` untuk hasil scan QR frontend.
3. Di folder **Care - Doctor Dashboard**, jalankan endpoint list/summary/vitals/abnormal untuk render dashboard web.
4. Untuk pairing desktop-style (web tampil QR, mobile scan), jalankan urutan:
   - `POST Create Dashboard Pairing Session`
   - `GET Dashboard Pairing Session Events (SSE)`
   - `POST Confirm Dashboard Pairing (Mobile Patient)`
   - `GET Dashboard Pairing Session Status` (fallback/polling)
5. Di folder **Biometrics**, jalankan `POST Ingest Biometrics` lalu `GET Biometrics History` untuk verifikasi ingestion time-series.
6. Di folder **Medication & Reminder**, gunakan `GET Medication Calendar` untuk mengambil feed kalender lintas-obat berbasis rentang tanggal (`from`/`to`).

## Endpoint QR Yang Primary vs Legacy

- Primary (dipakai frontend sekarang): `POST /doctors/{doctorId}/patients/link-by-patient-id`
  - Payload cukup `patientId` (hasil scan QR dari frontend).
- Legacy (opsional/backward compatibility):
  - `POST /patients/{patientId}/shares`
  - `POST /doctors/{doctorId}/patients/link-by-share`

Catatan: endpoint legacy tetap tersedia, tapi untuk integrasi FE terbaru gunakan flow `link-by-patient-id`.

## Endpoint Pairing Session (Desktop QR)

- `POST /doctors/{doctorId}/dashboard/pairing-sessions`
  - Membuat session pairing jangka pendek + token QR.
- `POST /dashboard/pairing-sessions/confirm`
  - Dipanggil mobile pasien setelah scan QR pairing token.
  - Mengembalikan `201` saat confirm baru, atau `200` bila session sudah mencapai status final (idempotent).
- `GET /doctors/{doctorId}/dashboard/pairing-sessions/{pairingSessionId}`
  - Polling status di web dashboard (pending/confirmed/expired).
- `GET /doctors/{doctorId}/dashboard/pairing-sessions/{pairingSessionId}/events`
  - Stream status realtime via SSE (`event: pairing-status`).

## Endpoint Biometrics (Phase 3)

- `POST /biometrics`
  - Ingest batch data biometrik (idempotent duplicate-safe).
- `GET /biometrics`
  - Ambil histori biometrik dengan filter `source`, `metricType`, `startAt`, `endAt`, pagination.

## Status Legacy Files

File export legacy/duplikat sudah dihapus dari repo.
Dengan begitu, source of truth Postman sekarang hanya file canonical di atas.

## Opsi Alternatif (Tanpa Collection JSON)

Kalau ingin generate request otomatis langsung dari Swagger:

1. Import `docs/openapi.yaml` ke Postman.
2. Tetap gunakan environment `postman/PulseWise-Local.postman_environment.json`.

Catatan: collection dari OpenAPI biasanya tidak punya test script sekomplet collection canonical.

## Sync Saved Response Examples

Canonical collection sekarang bisa diisi ulang dengan saved response examples yang digenerate dari `docs/openapi.yaml`.

Jalankan:

```bash
npm run postman:sync-examples
```

Yang dilakukan script:

1. Membaca schema/response dari `docs/openapi.yaml`
2. Membuat contoh response untuk setiap request di:
   - `postman/PulseWise-API.postman_collection.json`
   - `postman/PulseWise-Dashboard-Smoke.postman_collection.json`
3. Menyimpan hasilnya ke field `response` Postman agar example langsung terlihat saat import

Catatan:

- Script ini tidak perlu memanggil endpoint satu-satu.
- Jika schema OpenAPI punya `example`, nilai itu akan diprioritaskan.
- Jika belum ada `example`, script akan membangkitkan contoh otomatis dari schema.
