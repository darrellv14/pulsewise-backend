# Legacy Kotlin Firebase Alignment Review

Tanggal review: 2026-04-10
Sumber legacy: https://github.com/fransnicklaus/pulse-wise-2
Target alignment: Express.js + PostgreSQL backend untuk TA PulseWise

## Ringkasan Eksekutif

- Legacy app bukan backend terpisah, tetapi mobile client yang langsung menulis/membaca ke Firebase Auth + Firestore + Storage.
- Arsitektur legacy sudah punya domain use case yang rapi (user, diary, medication), sehingga mudah dijadikan acuan business rules.
- Backend Node saat ini sudah kuat di auth, doctor-patient care, dashboard pairing, dan biometrics ingestion.
- Gap terbesar terhadap legacy sekarang fokus pada pendalaman rule klinis heart diary, hardening compliance, dan acceptance test cutover.

## Temuan Arsitektur Legacy

- Auth:
  - Firebase email/password login.
  - Google Sign-In (One Tap) di client.
- Storage profile image:
  - Upload langsung dari client ke Firebase Storage.
- Data utama:
  - Disimpan di Firestore, lalu dicache di Room (local database Android).
- Pattern kode:
  - Repository + UseCase + ViewModel (MVVM).

## Pemetaan Sumber Data Legacy

Koleksi Firestore yang dipakai langsung oleh app:

- user
- emergencyContact
- ${userId}\_diary
- ${userId}\_medication
- ${userId}\_reminder
- ${userId}\_medicationLog

Storage path:

- images/user/{date}\_{filename}

Catatan penting:

- Pola koleksi per-user di Firestore perlu dinormalisasi di PostgreSQL menjadi tabel global berbasis user_id.

## Parity Matrix Legacy -> Backend Node

### Sudah selaras / sudah ada

- Auth register/login/me + role basic.
- Profile pasien/dokter.
- Doctor-patient linking.
- Dashboard doctor + pairing flow (termasuk SSE status).
- Biometrics ingestion + history.

### Sebagian selaras

- QR linking:
  - Legacy berfokus QR patientId murni di client.
  - Backend baru sudah mendukung link-by-patient-id dan pairing session.

### Belum tersedia (gap fungsional)

- Tidak ada gap fungsional langsung terhadap scope legacy Kotlin+Firebase (fitur inti sudah tersedia di backend Node).
- Backlog tersisa berfokus pada peningkatan di luar parity legacy: clinical rules lanjutan, hardening compliance, dan observability.

### Sudah diimplementasikan pada backend Node (update 2026-04-10)

- Medication CRUD.
- Reminder CRUD.
- Medication Log (`create + list`).
- Emergency Contact CRUD.
- Heart Diary baseline parity (`create/list/detail` + symptom/activity/consumption/body metrics).
- Avatar upload backend-managed flow (Cloudinary signed upload + save URL by backend).
- Enrichment profil pasien (`heightCm`, `isSmoking`, `isElectricSmoking`, `bloodType`, `address`).

## Risiko dan Catatan Kritis

- Legacy logic banyak berjalan di client, sehingga validasi dan otorisasi belum terpusat.
- Firestore per-user collection membuat query lintas pasien/dokter sulit untuk analytics.
- Di beberapa alur auth legacy, token retrieval dipanggil sebagai object string (bukan token final) sehingga tidak boleh dijadikan referensi implementasi backend baru.
- Format tanggal legacy beberapa modul memakai string locale (Indonesia), perlu distandardisasi ke ISO 8601/date typed columns.

## Rekomendasi Implementasi Selaras TA

### Phase A (Prioritas Tinggi)

- [x] Tambahkan modul API Emergency Contact.
- [x] Pastikan semua endpoint pakai thin controller + service logic + Zod validation + audit-friendly error envelope.

### Phase B (Prioritas Menengah)

- [x] Tambahkan modul API Heart Diary:
  - [x] diary harian.
  - [x] symptom.
  - [x] activity.
  - [x] consumption.
  - [x] body metrics manual.
- [x] Tetapkan boundary jelas antara diary manual dan biometrics time-series otomatis.

### Phase C (Prioritas Menengah)

- [x] Definisikan strategi avatar upload:
  - [x] opsi 1: backend upload proxy.
  - [x] opsi 2: signed URL + callback metadata.
- [x] Simpan metadata file di tabel relasional, bukan hard dependency ke path client-side.

### Phase D (Cutover Governance)

- [x] Larang mobile menulis langsung ke datastore utama.
- [x] Semua write operation wajib melalui backend Node.
- [x] Dokumentasikan parity acceptance test per modul sebelum final cutover.

## Definition of Alignment Done (Legacy Scope)

Alignment terhadap legacy dianggap selesai jika:

- Emergency contact parity: endpoint + rule parity pass.
- Diary parity: symptom/activity/consumption/body metrics parity pass.
- Medication parity: medication/reminder/log parity pass.
- Semua flow mobile utama tidak lagi direct write ke Firebase.
- Swagger + Postman sudah mencerminkan kontrak final (tanpa endpoint legacy yang dipensiunkan).

Status update 2026-04-10:

- Emergency contact parity: pass (API CRUD aktif + seed + kontrak Swagger/Postman sinkron).
- Diary parity: pass (API list/create/detail + symptom/activity/consumption/body metrics aktif + seed + kontrak sinkron).
- Medication parity: pass (CRUD + reminder + log tersedia).
- Direct write mobile ke datastore utama: pass by architecture (semua write melalui Node API).
- Swagger + Postman: pass (endpoint parity sudah tersinkron).

Evidence pengecekan akhir (2026-04-10):

- `npm run lint`: pass.
- `npm run migrate`: pass.
- `npm run seed:dev`, `npm run seed:dashboard`, `npm run seed:patient-care`: pass.
- `npm test`: pass (5 suites, 26 tests).
