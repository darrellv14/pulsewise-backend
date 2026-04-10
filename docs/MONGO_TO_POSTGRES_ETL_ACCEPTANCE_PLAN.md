# Mongo to PostgreSQL ETL and Acceptance Plan

Dokumen ini untuk migrasi data historis dashboard dari MongoDB ke PostgreSQL secara aman, terukur, dan bisa diaudit.

## 1. Scope ETL

Domain data yang dimigrasikan:

- Identitas pasien dan profil klinis pendukung.
- Time-series vital: tekanan darah, heart rate, oxygen saturation, berat, tinggi, BMI.
- Data pendukung report abnormal sesuai kebutuhan dashboard.

## 2. Prinsip Migrasi

- One-time ETL sebagai baseline cutover.
- Idempotent ETL (jalankan ulang tidak membuat duplikasi).
- Semua timestamp disimpan sebagai `TIMESTAMPTZ` dalam format UTC.
- Data lineage dicatat (asal dokumen Mongo dan target record PostgreSQL).

## 3. Tahapan Eksekusi

1. Ekstraksi

- Ambil data dari koleksi Mongo yang dipakai dashboard referensi.
- Simpan hasil extract sebagai artefak staging (JSON/CSV) dengan checksum.

2. Transformasi

- Mapping field Mongo ke skema PostgreSQL.
- Normalisasi metric type:
  - `heart_rate|heartrate|hr|pulse -> heartRate`
  - `oxygen_saturation|spo2|sp02|oxygen -> oxygenSaturation`
- Validasi unit dan nilai numerik.

3. Load

- Upsert ke tabel target (`users/patient_profiles/daily_metrics/vital_sign_readings` terkait).
- Gunakan batch insert dan kontrol transaksi.

4. Verifikasi

- Rekonsiliasi jumlah record per pasien dan per metrik.
- Bandingkan agregasi penting (min/max/avg) pada range tanggal yang sama.

## 4. Acceptance Criteria ETL

ETL dianggap berhasil jika:

- [ ] Total record per metrik antara Mongo staging dan PostgreSQL target match.
- [ ] Sample 10 pasien acak memiliki parity time-series lengkap.
- [ ] Tidak ada timestamp invalid/timezone drift.
- [ ] Endpoint dashboard Node menghasilkan payload klinis setara dengan referensi Django untuk dataset yang sama.
- [ ] Tidak ada duplikasi setelah ETL dijalankan ulang (idempotency pass).

## 5. Risiko dan Mitigasi

- Risiko perbedaan timezone.
  - Mitigasi: enforce UTC pada semua tahap transform/load.

- Risiko ketidakkonsistenan naming metric.
  - Mitigasi: kamus normalisasi metric type + test mapping otomatis.

- Risiko data null/korup.
  - Mitigasi: validation gate sebelum load + log reject record.

## 6. Cutover Policy

- Django + Chart.js tetap tersedia sebagai fallback observability selama masa validasi.
- Cutover final ke Node-only dilakukan setelah parity checklist dan ETL acceptance sama-sama lulus.
