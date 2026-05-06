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

- [x] Tambah cache untuk:
  - [x] `GET /doctors/:doctorId/dashboard/patients/:patientId/vitals`
  - [x] `GET /doctors/:doctorId/dashboard/patients/:patientId/abnormal-report`
  - [x] kandidat aman lain setelah profiling
- [x] Tambah invalidation setelah mutation yang memengaruhi dashboard:
  - [x] profile update
  - [x] biometrics ingest
  - [x] diary body metric update
  - [x] sleep/symptom/activity/consumption update bila memang memengaruhi summary
- [x] Review TTL:
  - [x] dashboard list TTL
  - [x] dashboard summary TTL
  - [x] diary by-date TTL
  - [x] vitals TTL
- [x] Tambah test cache hit, cache miss, dan invalidation

## Batch 6 - FE Contract Safety

- [x] Perketat contract test untuk auth
- [x] Perketat contract test untuk biometrics
- [x] Perketat contract test untuk diary by-date
- [x] Perketat contract test untuk dashboard
- [x] Tambah snapshot/shape assertions untuk payload FE-critical
- [x] Tambah checklist PR:
  - [x] route path tetap
  - [x] auth requirement tetap
  - [x] success envelope tetap
  - [x] existing response fields tetap ada

## Batch 7 - Redis Productionization

- [x] Pastikan Redis jalan di internal Docker network saja
- [x] Jangan expose port `6379` ke public internet
- [x] Pakai password Redis yang panjang dan acak
- [x] Simpan `REDIS_PASSWORD` di env production
- [x] Tambah persistence Redis (`appendonly` + volume)
- [x] Tambah healthcheck Redis di compose production
- [x] Verifikasi backend fallback behavior saat Redis unavailable

## CORS Production Checklist

- [x] Kumpulkan semua origin frontend production/staging/dev
- [x] Isi `CORS_ALLOWED_ORIGINS` dengan origin frontend saja
- [x] Jangan masukkan path apa pun ke origin CORS
- [x] Jangan gunakan domain API/ML sebagai origin FE kecuali browser app memang di-serve dari sana
- [x] Set `CORS_ALLOW_ALL=false` di production

## Deployment Checklist After Each Batch

- [x] `npm run lint`
- [x] `npm test`
- [x] smoke subset yang relevan
- [x] update env example bila ada config baru
- [x] update docs deploy bila ada perubahan infra
- [x] update OpenAPI/Postman jika ada perubahan additive pada contract

Catatan:

- Untuk Batch 5-7 tidak ada perubahan additive pada public response contract, jadi OpenAPI/Postman tidak perlu diubah.
- Smoke subset yang sudah diverifikasi mencakup health endpoint production, rebuild compose, dan hit endpoint dashboard yang menghasilkan key Redis nyata di production.

## Roadmap to 95+

- [x] Tambah persistence hasil inference ML di `pulsewise-backend`:
  - [x] buat tabel snapshot/history hasil ML (`prediction` dan `recommendation`)
  - [x] simpan hasil inference saat endpoint prediction/recommendation dipanggil
  - [x] tambah endpoint latest prediction/recommendation untuk FE
  - [x] tambah endpoint history prediction/recommendation untuk kebutuhan audit/riwayat
  - [x] jaga agar HFMS tetap fokus di inferensi, bukan persistence user-facing
- [x] Pecah `src/services/medicationService.js` menjadi modul bounded:
  - [x] medication catalog/query service
  - [x] medication mutation service
  - [x] reminder service
  - [x] medication log/history service
  - [x] cache invalidation/tag helper
- [x] Pisah `src/services/mlRecommendationService.js`:
  - [x] ML readiness service
  - [x] ML payload assembly service
  - [x] ML transport/client service
  - [x] ML prediction/recommendation orchestration service
- [ ] Haluskan `src/services/care/doctorDashboardService.js`:
  - [x] split summary service
  - [x] split vitals series service
  - [x] split abnormal report service
  - [x] tambah observability untuk cache hit/miss
- [x] Tambah observability Redis/cache:
  - [x] log cache hit/miss terstruktur untuk endpoint utama
  - [x] counter sederhana untuk invalidation per domain
  - [x] health/debug visibility untuk status Redis client dan cache metrics
- [x] Sinkronkan OpenAPI dan Postman penuh dengan contract yang sudah dikunci test
- [x] Migrasikan base path canonical ke root tanpa prefix versi:
  - [x] update runtime route menjadi tanpa `/api/v1`
  - [x] update OpenAPI + Postman + smoke tooling ke base path baru
  - [x] update FE/mobile/web base URL handoff docs
  - [x] dokumentasikan perubahan sebagai breaking API base-path change
