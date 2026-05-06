# Django Deprecation Matrix (Post-Parity)

Dokumen ini mendefinisikan endpoint/fitur Django yang boleh dipensiunkan bertahap setelah parity dashboard Django vs PulseWise dinyatakan lulus.

Dokumen operasional pendukung:

- `docs/DJANGO_CUTOVER_EXECUTION_TRACKER.md`
- `docs/DJANGO_NODE_FEATURE_MIGRATION_MAP.md`

## Evidence Gate

Deprecation hanya boleh jalan jika seluruh gate ini terpenuhi:

- `docs/parity/parity-report.json` menunjukkan seluruh pasien `passed=true`.
- `docs/parity/golden-django-5p-30d.json` tersedia sebagai baseline snapshot.
- `docs/DJANGO_PULSEWISE_PARITY_CHECKLIST.md` bagian field/process/endpoint sudah tercentang.

## Tahap 0 - Freeze (langsung aktif)

Status: **aktif sekarang**

- Bekukan fitur baru di Django (hanya bugfix operasional).
- Semua perubahan domain klinis, contract API, dan rule anomali dilakukan di PulseWise Node.
- Chart.js tetap dipakai sebagai visual fallback selama masa observasi.

## Tahap 1 - Switch Read Path

Kapan: setelah parity pass pertama.

Status saat ini: **in progress**.

Aksi:

- Paksa semua view dashboard Django mengambil data dari PulseWise API (bukan query DB lokal/non-PulseWise).
- Endpoint Django yang hanya proxy data tetap diizinkan sementara sebagai compatibility layer.

Endpoint Django yang masuk compatibility layer (contoh yang dipakai pipeline parity):

- `GET /api/list-patients/`
- `GET /api/{patientId}/json/`
- `GET /api/{patientId}/generate-abnormal-report/`

Exit criteria:

- Monitoring 1-2 sprint tanpa mismatch parity baru.
- Tidak ada insiden auth/session blocking untuk dokter.

## Tahap 2 - Soft Deprecation (Announcement)

Kapan: setelah tahap 1 stabil.

Status saat ini: **belum aktif**.

Aksi:

- Tandai endpoint compatibility Django sebagai deprecated (header/log/peringatan internal).
- Hentikan pengembangan fitur tambahan pada endpoint compatibility tersebut.
- Update klien internal agar menggunakan endpoint PulseWise langsung:
  - `GET /doctors/{doctorId}/dashboard/patients`
  - `GET /doctors/{doctorId}/dashboard/patients/{patientId}`
  - `GET /doctors/{doctorId}/dashboard/patients/{patientId}/vitals`
  - `GET /doctors/{doctorId}/dashboard/patients/{patientId}/abnormal-report`

Exit criteria:

- Seluruh consumer yang teridentifikasi sudah migrasi ke endpoint PulseWise.
- Tidak ada request produksi bermakna ke endpoint compatibility Django selama window observasi.

## Tahap 3 - Hard Cut

Kapan: setelah soft deprecation lulus.

Status saat ini: **belum aktif**.

Aksi:

- Matikan endpoint compatibility Django:
  - `GET /api/list-patients/`
  - `GET /api/{patientId}/json/`
  - `GET /api/{patientId}/generate-abnormal-report/`
- Pertahankan hanya route Django yang benar-benar dibutuhkan untuk kebutuhan UI transisi terbatas (jika ada).
- PulseWise Node menjadi satu-satunya backend data klinis dashboard.

Exit criteria:

- Smoke test end-to-end lulus setelah endpoint compatibility dimatikan.
- Tidak ada rollback selama periode hypercare yang disepakati.

## Rollback Guard

Jika terjadi regresi setelah tahap 2/3:

- Re-enable sementara compatibility endpoint Django maksimum 1 sprint.
- Jalankan ulang parity capture + compare.
- Perbaiki contract/regression di PulseWise, lalu ulangi window observasi.
