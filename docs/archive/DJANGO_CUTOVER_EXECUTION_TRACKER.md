# Django Cutover Execution Tracker

Dokumen ini adalah tracker operasional untuk menjalankan Tahap 1 sampai Tahap 3 secara terkontrol setelah parity pass.

## 1. Baseline Saat Ini

- Parity status: lulus (lihat `docs/parity/parity-report.json`).
- Golden dataset tersedia (lihat `docs/parity/golden-django-5p-30d.json`).
- Matrix deprecation: `docs/DJANGO_DEPRECATION_MATRIX.md`.

## 2. Tahap 1 - Switch Read Path (Wajib jalan dulu)

Tujuan:

- Semua read path dashboard Django hanya mengambil data dari PulseWise API.
- Django tidak lagi membaca MongoDB/Postgres lokal untuk data dashboard klinis.

Checklist implementasi:

- [ ] View list pasien Django memakai Node endpoint `GET /doctors/{doctorId}/dashboard/patients`.
- [ ] View detail/summary pasien Django memakai Node endpoint `GET /doctors/{doctorId}/dashboard/patients/{patientId}`.
- [ ] Data chart time-series di Django memakai Node endpoint `GET /doctors/{doctorId}/dashboard/patients/{patientId}/vitals`.
- [ ] Data abnormal report di Django memakai Node endpoint `GET /doctors/{doctorId}/dashboard/patients/{patientId}/abnormal-report`.
- [ ] Tidak ada query langsung ke source historis non-PulseWise pada view dashboard.

Validasi teknis harian:

1. Jalankan parity compare ulang.

```powershell
$loginBody = @{ email = 'doctor@pulsewise.local'; password = 'dev12345' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/auth/login' -ContentType 'application/json' -Body $loginBody
$env:PARITY_NODE_TOKEN = $loginResp.data.token
$env:PARITY_DOCTOR_ID = $loginResp.data.user.userId
npm run parity:compare
```

2. Simpan bukti untuk tiap deploy:

- Ringkasan hasil parity dari `docs/parity/parity-report.json`.
- Bukti request Django menuju Node (app log / reverse proxy log).

## 3. Monitoring Window 1-2 Sprint (Exit Tahap 1)

Syarat lolos menuju soft deprecation:

- [ ] Tidak ada mismatch parity baru pada dataset golden.
- [ ] Tidak ada incident auth/session blocking dokter.
- [ ] Tidak ada fallback query ke source data lama di Django dashboard.

Template log monitoring mingguan:

| Minggu          | Parity Pass | Incident Auth | Endpoint Compatibility Masih Dipakai | Catatan |
| --------------- | ----------- | ------------- | ------------------------------------ | ------- |
| Sprint-1 Week-1 |             |               |                                      |         |
| Sprint-1 Week-2 |             |               |                                      |         |
| Sprint-2 Week-1 |             |               |                                      |         |
| Sprint-2 Week-2 |             |               |                                      |         |

## 4. Tahap 2 - Soft Deprecation

Aktifkan hanya jika bagian monitoring lolos.

Checklist:

- [ ] Tambahkan penanda deprecated pada endpoint compatibility Django:
  - `GET /api/list-patients/`
  - `GET /api/{patientId}/json/`
  - `GET /api/{patientId}/generate-abnormal-report/`
- [ ] Umumkan deadline penghentian endpoint compatibility ke seluruh consumer internal.
- [ ] Pantau traffic endpoint compatibility hingga nol.

Template bukti nol traffic:

| Tanggal    | list-patients hit | patient-json hit | abnormal-report hit | Status |
| ---------- | ----------------- | ---------------- | ------------------- | ------ |
| YYYY-MM-DD |                   |                  |                     |        |
| YYYY-MM-DD |                   |                  |                     |        |
| YYYY-MM-DD |                   |                  |                     |        |

## 5. Tahap 3 - Hard Cut

Aktifkan hanya jika traffic compatibility endpoint nol dan smoke test stabil.

Checklist:

- [ ] Nonaktifkan route compatibility Django (`/api/list-patients/`, `/{patientId}/json/`, `/api/{patientId}/generate-abnormal-report/`).
- [ ] Jalankan smoke test E2E (login dokter -> list -> detail -> chart -> report).
- [ ] Tetapkan rollback window maksimum 1 sprint.

## 6. Status Eksekusi Saat Ini

- Tahap 1: **In Progress** (go-live checklist disiapkan, implementasi penuh dilakukan di repo Django).
- Tahap 2: **Belum aktif**.
- Tahap 3: **Belum aktif**.
