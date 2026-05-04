# PulseWise Backend Refactor TODO

Dokumen ini memecah roadmap refactor besar menjadi batch yang bisa dikerjakan bertahap tanpa merusak frontend yang sudah ada.

## Ground Rules

- Semua endpoint public existing harus tetap jalan.
- Tidak boleh ada route rename, method change, atau response field removal.
- Perubahan response hanya boleh additive.
- Semua batch wajib lolos `npm run lint` dan `npm test`.
- Setiap perubahan yang menyentuh contract harus diikuti update OpenAPI dan Postman setelah stabil.

## Batch 1 - Done

- [x] Hardening env untuk production fail-fast
- [x] CORS allowlist support
- [x] Auth middleware re-check user aktif
- [x] Error detail tidak otomatis bocor di production
- [x] Redis-ready rate limiter dengan fallback memory
- [x] Ekstraksi auth service menjadi modul bounded
- [x] Shared util `httpError`
- [x] Shared util `metricTypes`
- [x] Selective cache awal untuk:
  - [x] doctor dashboard patients list
  - [x] doctor dashboard patient summary
  - [x] diary by-date

## Batch 2 - Split `patientCareService`

- [x] Buat modul `src/services/patient-care/diaryService.js`
- [x] Buat modul `src/services/patient-care/bodyMetricService.js`
- [x] Buat modul `src/services/patient-care/symptomService.js`
- [x] Buat modul `src/services/patient-care/activityService.js`
- [x] Buat modul `src/services/patient-care/consumptionService.js`
- [x] Buat modul `src/services/patient-care/sleepService.js`
- [x] Buat modul `src/services/patient-care/avatarService.js`
- [x] Jadikan `src/services/patientCareService.js` facade tipis
- [x] Pastikan invalidation cache diary/dashboard tetap konsisten setelah split
- [x] Tambah regression tests untuk flow by-date dan avatar

## Batch 3 - Split `careService`

- [x] Buat modul `src/services/care/patientProfileService.js`
- [x] Buat modul `src/services/care/doctorPatientService.js`
- [x] Buat modul `src/services/care/patientShareService.js`
- [x] Buat modul `src/services/care/doctorDashboardService.js`
- [x] Buat modul `src/services/care/patientMlAssessmentService.js`
- [x] Jadikan `src/services/careService.js` facade tipis
- [x] Pastikan dashboard pairing tetap delegasi ke service terpisah yang jelas
- [x] Tambah regression tests untuk dashboard list, summary, vitals, abnormal-report

## Batch 4 - Shared Guards, Mapper, dan Constants

- [x] Pusatkan access guard:
  - [x] doctor scope
  - [x] patient scope
  - [x] patient resource access
  - [x] doctor-patient linked access
- [x] Pusatkan mapper:
  - [x] patient identity
  - [x] latest vital snapshot
  - [x] diary detail
  - [x] dashboard summary
- [x] Pusatkan constants/enums internal:
  - [x] metric types
  - [x] biometric sources
  - [x] condition tags
  - [x] account status
  - [x] pairing status
- [x] Hapus helper `createHttpError` lokal yang masih tersisa

## Batch 5 - Cache and Invalidation Expansion

- [ ] Tambah cache untuk:
  - [ ] `GET /api/v1/doctors/:doctorId/dashboard/patients/:patientId/vitals`
  - [ ] `GET /api/v1/doctors/:doctorId/dashboard/patients/:patientId/abnormal-report`
  - [ ] kandidat aman lain setelah profiling
- [ ] Tambah invalidation setelah mutation yang memengaruhi dashboard:
  - [ ] profile update
  - [ ] biometrics ingest
  - [ ] diary body metric update
  - [ ] sleep/symptom/activity/consumption update bila memang memengaruhi summary
- [ ] Review TTL:
  - [ ] dashboard list TTL
  - [ ] dashboard summary TTL
  - [ ] diary by-date TTL
  - [ ] vitals TTL
- [ ] Tambah test cache hit, cache miss, dan invalidation

## Batch 6 - FE Contract Safety

- [ ] Perketat contract test untuk auth
- [ ] Perketat contract test untuk biometrics
- [ ] Perketat contract test untuk diary by-date
- [ ] Perketat contract test untuk dashboard
- [ ] Tambah snapshot/shape assertions untuk payload FE-critical
- [ ] Tambah checklist PR:
  - [ ] route path tetap
  - [ ] auth requirement tetap
  - [ ] success envelope tetap
  - [ ] existing response fields tetap ada

## Batch 7 - Redis Productionization

- [ ] Pastikan Redis jalan di internal Docker network saja
- [ ] Jangan expose port `6379` ke public internet
- [ ] Pakai password Redis yang panjang dan acak
- [ ] Simpan `REDIS_PASSWORD` di env production
- [ ] Tambah persistence Redis (`appendonly` + volume)
- [ ] Tambah healthcheck Redis di compose production
- [ ] Verifikasi backend fallback behavior saat Redis unavailable

## CORS Production Checklist

- [ ] Kumpulkan semua origin frontend production/staging/dev
- [ ] Isi `CORS_ALLOWED_ORIGINS` dengan origin frontend saja
- [ ] Jangan masukkan path seperti `/api/v1`
- [ ] Jangan gunakan domain API/ML sebagai origin FE kecuali browser app memang di-serve dari sana
- [ ] Set `CORS_ALLOW_ALL=false` di production

## Deployment Checklist After Each Batch

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] smoke subset yang relevan
- [ ] update env example bila ada config baru
- [ ] update docs deploy bila ada perubahan infra
- [ ] update OpenAPI/Postman jika ada perubahan additive pada contract
