# Parity Execution Runbook (Django vs PulseWise)

Dokumen ini menjelaskan langkah operasional untuk:

- Mengambil golden dataset dari backend Django (5 pasien, 30 hari).
- Membandingkan parity otomatis ke backend Node PulseWise.
- Menentukan fitur Django yang boleh dipensiunkan bertahap setelah parity lulus.

## 1. Prasyarat

- Django API aktif dan bisa diakses.
- Node PulseWise API aktif dan bisa diakses.
- Tersedia token dokter yang valid untuk masing-masing backend.

## 2. Toleransi Numerik (Source of Truth)

Gunakan file:

- `docs/parity/parity-tolerance.json`

Default yang dipakai:

- Exact (`0`): `systolicBp`, `diastolicBp`, `heartRate`, `oxygenSaturation`, `age`
- Toleransi kecil (`0.01`): `weight`, `height`, `bmi`, statistik `avg/min/max`
- Timestamp tolerance: `60` detik (endpoint Django `generate-abnormal-report` membulatkan label waktu ke menit)

## 3. Capture Golden Dataset Dari Django

Set environment variable (PowerShell):

```powershell
$env:PARITY_DOCTOR_ID="<doctor_uuid>"
$env:PARITY_DJANGO_WEB_BASE_URL="http://127.0.0.1:8000"
$env:PARITY_DJANGO_USERNAME="parityadmin"
$env:PARITY_DJANGO_PASSWORD="parity12345"
$env:PARITY_PATIENT_LIMIT="5"
$env:PARITY_DAYS="30"
npm run parity:capture:django
```

Output:

- `docs/parity/golden-django-5p-30d.json`

Catatan:

- Bila ingin patient tertentu (bukan auto top-5), isi:
  - `PARITY_PATIENT_IDS="uuid1,uuid2,uuid3,uuid4,uuid5"`
- Jika path threshold Django berbeda, isi:
  - `PARITY_DJANGO_THRESHOLD_PATH="<path>/dashboard/threshold.py"`

## 4. Compare Node vs Golden Django

Set environment variable (PowerShell):

```powershell
$env:PARITY_NODE_BASE_URL="http://localhost:5000"
$env:PARITY_NODE_TOKEN="<doctor_token_node>"
$env:PARITY_DOCTOR_ID="<doctor_uuid>"
npm run parity:compare
```

Output:

- `docs/parity/parity-report.json`

Exit code:

- `0` jika seluruh pasien lulus parity.
- `1` jika ada mismatch.

## 5. Kriteria Lulus Parity

Parity dinyatakan lulus bila:

- Semua pasien pada golden dataset `passed=true`.
- Tidak ada mismatch field kritikal:
  - `timestamp/measuredAt`, `systolicBp`, `diastolicBp`, `heartRate`, `oxygenSaturation`, `weight`, `height`, `bmi`, `age`, `latestVitals`, `thresholds`, `abnormalInstances`.
- Tidak ada regresi klasifikasi anomali klinis.

## 6. Retirement Plan Django (Bertahap)

Lakukan deprecation bertahap hanya setelah parity pass:

Referensi matriks endpoint/fitur yang dipensiunkan:

- `docs/DJANGO_DEPRECATION_MATRIX.md`

1. Tahap A - Read switch

- Django view baca data dari PulseWise API untuk endpoint dashboard utama.
- Chart.js tetap aktif untuk observasi visual.

2. Tahap B - Freeze

- Bekukan fitur baru di backend Django (kecuali bugfix).
- Semua perubahan domain klinis hanya di PulseWise Node.

3. Tahap C - Controlled deprecation

- Nonaktifkan endpoint Django yang sudah 100% parity dan tidak lagi dipakai klien.
- Simpan fallback period terbatas (misalnya 2 sprint) sebelum hard cut.

4. Tahap D - Final cutover

- Setelah smoke + parity stabil, Django backend domain dashboard dipensiunkan.
- PulseWise Node menjadi satu-satunya source backend untuk mobile/dashboard.
