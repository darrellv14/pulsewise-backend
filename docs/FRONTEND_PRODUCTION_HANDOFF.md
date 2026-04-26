# Frontend Production Handoff (PulseWise)

Dokumen ini adalah handoff final untuk tim frontend setelah backend live di VPS.

Dokumen pendamping yang lebih detail untuk flow live sekarang:

- `docs/FRONTEND_LIVE_INTEGRATION_GUIDE.md`

## 1. Status Deployment Saat Ini

Environment production aktif di VPS:

- Host VPS: `168.144.44.43`
- PulseWise backend: live
- HFMS backend: live
- PostgreSQL: live
- Migration: sudah sampai `0012_ml_hfms_v3_foundation.sql`
- Nginx edge proxy: aktif

Hasil smoke test end-to-end: semua endpoint utama `200`.

Referensi deployment:

- `pulsewise-backend`: deploy berbasis GitHub repo `darrellv14/pulsewise-backend`
- `ml-cnn-backend`: deploy berbasis GitHub repo `darrellv14/ml-cnn-backend`

## 2. Base URL Untuk Frontend

Gunakan konfigurasi berikut di frontend:

### Sebelum domain + SSL aktif

- API base: `http://168.144.44.43/api/v1`

### Setelah domain + SSL aktif

- API base final: `https://api.darrellvalentino.com/api/v1`

Catatan:

- Frontend web/mobile cukup ke `api.darrellvalentino.com`.
- `ml.darrellvalentino.com` disediakan untuk debug/smoke/admin, bukan primary origin frontend.

## 3. Endpoint Yang Dipakai Frontend

### Auth

- `POST /auth/login`
- `GET /auth/me`

### Dashboard dokter

- `GET /doctors/{doctorId}/dashboard/patients`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/vitals`
- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/abnormal-report`

### ML flow pasien

- `GET /users/{userId}/ml-readiness`
- `POST /users/{userId}/ml-predictions`
- `POST /users/{userId}/ml-recommendations`

### ML flow dashboard dokter

- `GET /doctors/{doctorId}/dashboard/patients/{patientId}/ml-readiness`
- `POST /doctors/{doctorId}/dashboard/patients/{patientId}/ml-predictions`
- `POST /doctors/{doctorId}/dashboard/patients/{patientId}/ml-recommendations`

## 4. Seed Account Production (Untuk QA)

- Patient: `seed.patient2@pulsewise.local` / `dev12345`
- Doctor: `doctor@pulsewise.local` / `dev12345`

Gunakan hanya untuk QA/staging-style verification. Jangan expose ke user nyata.

## 5. Environment Variable Frontend

Contoh `.env` frontend web:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.darrellvalentino.com/api/v1
```

Contoh React/Vite:

```env
VITE_API_BASE_URL=https://api.darrellvalentino.com/api/v1
```

## 6. Catatan Integrasi Penting

- Endpoint `/docs` memang `404` pada production (`NODE_ENV=production`) karena Swagger dimatikan.
- Jangan hardcode IP VPS di kode frontend. Gunakan env var.
- Semua request authenticated harus selalu kirim `Authorization: Bearer <token>`.
- Untuk ML, frontend tidak perlu call service HFMS langsung.

## 7. Checklist Go-Live Frontend

1. Ganti base URL dari IP ke `https://api.darrellvalentino.com/api/v1`.
2. Pastikan semua call auth/profile/dashboard/ML memakai base URL yang sama.
3. Jalankan smoke test login doctor + patient.
4. Validasi halaman dashboard dokter detail pasien.
5. Validasi flow ML readiness -> prediction -> recommendation.
6. Pastikan error handling untuk status `401`, `403`, `409`, `502`, `503`, `504`.

## 8. Referensi

- Integrasi endpoint: `docs/FRONTEND_INTEGRATION_GUIDE.md`
- Deploy VPS: `docs/DIGITALOCEAN_SINGLE_DROPLET_DEPLOYMENT.md`
- Collection Postman: `postman/PulseWise-API.postman_collection.json`
- Env Postman production: `postman/environments/PulseWise-Production.postman_environment.json`
- Checklist recovery VPS: `docs/VPS_RECOVERY_CHECKLIST.md`
