# FCM Backend Rollout Plan

Dokumen ini melacak implementasi bertahap Firebase Cloud Messaging (FCM) pada backend PulseWise.

Tujuan akhirnya bukan hanya menyimpan token device, tetapi juga menyediakan fondasi notifikasi production-ready untuk:

- medication reminder
- dashboard pairing
- abnormal vital alert
- ML result ready

## Prinsip Implementasi

- rollout dilakukan bertahap agar contract FE-BE tetap stabil
- schema dibuat cukup lengkap sejak awal agar tidak perlu refactor besar saat event notifikasi bisnis ditambahkan
- stage awal fokus pada token registry lifecycle
- stage berikutnya fokus pada delivery engine dan event bisnis

## Stage 1 - FCM Token Registry Lifecycle

Status: **Implemented**

Cakupan:

- [x] tambah tabel `fcm_device_tokens`
- [x] tambah tabel fondasi `push_notification_logs`
- [x] tambah relasi Prisma dari `User`
- [x] tambah repository registry token FCM
- [x] tambah service lifecycle token:
  - [x] register / update token
  - [x] list token user
  - [x] revoke token saat logout
- [x] tambah controller dan routes:
  - [x] `POST /users/:userId/fcm-tokens`
  - [x] `GET /users/:userId/fcm-tokens`
  - [x] `DELETE /users/:userId/fcm-tokens`
- [x] tambah validator request FCM token
- [x] tambah guard akses self-scope untuk user token management
- [x] tambah dokumentasi rollout ini
- [x] tambah test validator, service, dan contract stage 1

Catatan:

- stage ini **belum** mengirim notification ke Firebase
- stage ini memastikan FE sudah bisa menyimpan, refresh, dan revoke token dengan contract backend yang stabil

## Stage 2 - FCM Delivery Engine

Status: **Implemented**

Cakupan target:

- [x] integrasi FCM HTTP v1 sender di backend via `google-auth-library`
- [x] loading credentials Firebase dari secret/env server
- [x] support credential via:
  - [x] `FIREBASE_SERVICE_ACCOUNT_PATH`
  - [x] inline env (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PRIVATE_KEY_ID`)
- [x] helper kirim ke satu token
- [x] helper kirim ke semua token aktif milik user
- [x] auto-mark token invalid saat provider mengembalikan error terminal
- [x] endpoint test:
  - [x] `POST /users/:userId/fcm-test`
- [x] persist hasil pengiriman ke `push_notification_logs`

Catatan:

- stage ini belum menambahkan scheduler reminder obat otomatis
- endpoint test dipakai untuk validasi end-to-end FE -> backend -> FCM
- token aktif yang tidak valid akan ditandai gagal, dan token terminal seperti `UNREGISTERED` akan dinonaktifkan

## Stage 3 - Medication Reminder Notifications

Status: **Implemented**

Cakupan target:

- [x] builder payload `medication_reminder`
- [x] trigger manual notifikasi reminder berdasarkan medication + reminder
- [x] pencatatan delivery log via `push_notification_logs`
- [x] contract payload final untuk FE action `open_medication_reminder`
- [x] endpoint manual trigger:
  - [x] `POST /users/:userId/medications/:medicationId/reminder-notification`
- [x] scheduler reminder otomatis per menit
- [x] grace window lookback 2 menit
- [x] dedupe reminder slot via `push_notification_logs.dedupe_key`

Catatan:

- scheduler dijalankan di runtime backend dengan interval per menit
- slot reminder diproses dengan lookback kecil agar aman saat restart singkat
- dedupe saat ini mengutamakan anti-double-send untuk slot reminder yang sama
- smoke test otomatis tersedia via `npm run smoke:fcm:scheduler`
- smoke test ini membuat medication sementara, menunggu scheduler pickup, lalu memverifikasi perubahan `lastSentAt` token

## Stage 4 - Dashboard Pairing Notifications

Status: **Implemented**

Cakupan target:

- [x] builder payload `dashboard_pairing`
- [x] trigger saat pairing session confirmed
- [x] payload deep-link action untuk mobile
- [x] dedupe pairing confirmation notification via `push_notification_logs.dedupe_key`

Catatan:

- notifikasi pairing saat ini dikirim ke pasien yang berhasil mengonfirmasi pairing
- delivery bersifat best-effort agar flow pairing tidak gagal bila token FCM user belum tersedia

## Stage 5 - Abnormal Vital Alerts

Status: **Implemented**

Cakupan target:

- [x] builder payload `abnormal_vital_alert`
- [x] trigger dari hasil ingest biometrics
- [x] threshold-aware notification policy untuk heart rate dan SpO2
- [x] dedupe alert via `push_notification_logs.dedupe_key`

Catatan:

- stage ini saat ini fokus pada metrik vital yang masuk lewat ingestion biometrics:
  - `heart_rate`
  - `oxygen_saturation`
- blood pressure dan weight-based abnormality belum otomatis menembakkan push notification
- delivery bersifat best-effort agar ingest biometrics tidak gagal bila token FCM user belum tersedia

## Stage 6 - ML Result Ready Notifications

Status: **Implemented**

Cakupan target:

- [x] builder payload `ml_result_ready`
- [x] trigger setelah inference result berhasil dipersist
- [x] notifikasi best-effort ke pasien
- [x] dedupe notification via `push_notification_logs.dedupe_key`

Catatan:

- stage ini saat ini mengirim notifikasi ke pasien setelah hasil inference tersimpan
- distribusi notifikasi khusus ke requester selain pasien belum ditambahkan

## Contract Stage 1

### `POST /users/:userId/fcm-tokens`

Tujuan:

- register token baru
- refresh token yang sama
- update metadata device
- memindahkan ownership token ke user aktif terbaru bila token yang sama dipakai lagi

### `GET /users/:userId/fcm-tokens`

Tujuan:

- melihat token registry milik user
- membantu debugging FE dan observability awal

### `DELETE /users/:userId/fcm-tokens`

Tujuan:

- revoke token saat logout
- menonaktifkan token berdasarkan `fcmToken` atau `deviceId`

## Catatan Keamanan

- Firebase service-account JSON tidak boleh di-commit ke repo
- secret sebaiknya dipasang lewat env atau path file di server
- bila credential pernah tersebar di tempat yang tidak aman, private key harus di-rotate
