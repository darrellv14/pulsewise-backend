# PulseWise Backend API

PulseWise Backend adalah REST API utama untuk sistem PulseWise. Repo ini menangani autentikasi, data pasien dan dokter, diary kesehatan harian, dashboard monitoring dokter, biometrics time-series, dan integrasi ke microservice Machine Learning HFMS.

Frontend web/mobile seharusnya berbicara ke repo ini, bukan langsung ke service ML. Backend ini bertugas membaca data pasien dari PostgreSQL, memvalidasi kelengkapannya, menyusun payload 67 field untuk model HFMS v3, lalu meneruskan request prediction/recommendation ke microservice ML.

Model ML hidup di repo terpisah [ml-cnn-backend](https://github.com/darrellv14/ml-cnn-backend).

## What This Repo Owns

- Authentication dan authorization berbasis JWT
- Role `patient` dan `doctor`
- Patient profile, doctor profile, serta relasi doctor-patient
- Diary harian pasien:
  - body metrics
  - sleep
  - symptoms
  - activities
  - consumptions
- Biometrics ingestion dan retrieval
- Doctor dashboard API
- ML readiness, ML payload assembly, prediction, dan recommendation proxy
- OpenAPI spec, Postman collections, dan smoke tooling untuk backend ini

## What This Repo Does Not Own

- Model CNN / model inference code HFMS
- Training pipeline Machine Learning
- Frontend dashboard/web/mobile
- Django legacy dashboard lama

Model ML hidup di repo terpisah `hfms-backend` atau `ml-cnn-backend`. Repo ini hanya menjadi application backend dan broker data ke service tersebut.

## High-Level Architecture

```text
Frontend App / Dashboard
          |
          v
PulseWise Backend (Express + Prisma)
          |
          +--> PostgreSQL
          |
          +--> HFMS ML Microservice
```

Alur untuk fitur ML:

1. Frontend mengisi profile, assessment, diary, dan body metrics ke PulseWise Backend.
2. Frontend memanggil endpoint `ml-readiness`.
3. Jika data lengkap, frontend memanggil `ml-predictions` atau `ml-recommendations`.
4. Backend membentuk payload NHANES/HFMS v3.
5. Backend memanggil service ML secara internal.
6. Hasil inference dikembalikan lagi ke frontend melalui backend ini.

## Main Features

### 1. Auth and User Management

- register, login, me
- OTP flow via email
- Google login support
- patient / doctor authorization boundaries

### 2. Patient Care and Diaries

- body metrics harian
- sleep diary
- symptom diary
- activity diary
- food consumption diary

### 3. Doctor Dashboard

- daftar pasien
- detail pasien
- vitals timeline
- abnormal report
- pairing / linking flow

### 4. Biometrics

- ingest data biometrik time-series
- retrieve data per metric

### 5. HFMS / ML Integration

- ML profile
- ML assessments
- readiness check
- payload builder
- prediction proxy
- recommendation proxy

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma
- Zod
- Jest + Supertest
- Swagger UI / OpenAPI
- Docker / Docker Compose

## Prerequisites

Sebelum menjalankan project ini, siapkan:

- Node.js `20+`
- npm
- PostgreSQL
- Docker dan Docker Compose jika ingin containerized workflow

## Environment Variables

Copy `.env.example` menjadi `.env`, lalu isi sesuai environment Anda.

```bash
cp .env.example .env
```

Variabel minimum yang biasanya perlu diisi:

### App

- `PORT`
- `NODE_ENV`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

### Database

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `DIRECT_URL`

### Mail / OTP

- `MAILTRAP_TOKEN`
- `MAILTRAP_SENDER_EMAIL`
- `MAILTRAP_SENDER_NAME`

### ML Microservice

- `ML_SERVICE_BASE_URL`
- `ML_SERVICE_TIMEOUT_MS`
- `ML_SERVICE_VERSION`

Contoh pengisian lokal PostgreSQL:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pulsewise
POSTGRES_USER=pulsewise
POSTGRES_PASSWORD=pulsewise123

DATABASE_URL=postgresql://pulsewise:pulsewise123@localhost:5432/pulsewise
DIRECT_DATABASE_URL=postgresql://pulsewise:pulsewise123@localhost:5432/pulsewise
DIRECT_URL=postgresql://pulsewise:pulsewise123@localhost:5432/pulsewise

ML_SERVICE_BASE_URL=http://localhost:8080
ML_SERVICE_TIMEOUT_MS=20000
ML_SERVICE_VERSION=3
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Generate Prisma client

```bash
npm run prisma:generate
```

### 3. Apply Prisma migrations

```bash
npm run prisma:migrate:dev
```

Jika Anda memakai flow SQL/manual migration helper di repo ini:

```bash
npm run db:migrate
```

### 4. Seed local data jika perlu

```bash
npm run seed:dev
npm run seed:dashboard
npm run seed:patient-care
```

### 5. Run backend

```bash
npm run dev
```

Server default berjalan di:

```text
http://localhost:5000
```

## Common Commands

```bash
npm run dev
npm start
npm test
npm run lint
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run db:migrate
npm run seed:dev
npm run seed:dashboard
npm run seed:patient-care
npm run postman:sync-examples
npm run postman:refresh
npm run smoke:hfms:e2e
npm run smoke:prod
```

## Postman and API Testing

Repo ini memakai Postman sebagai workflow testing utama.

Collection penting:

- `postman/PulseWise-API.postman_collection.json`
  Collection canonical berisi endpoint utama backend.
- `postman/PulseWise-Dashboard-Smoke.postman_collection.json`
  Collection smoke test untuk flow login, dashboard, dan ML.

Environment penting:

- `postman/PulseWise-Local.postman_environment.json`
- `postman/environments/PulseWise-Production.postman_environment.json`

Jika Anda mengubah contract OpenAPI atau examples:

```bash
npm run postman:sync-examples
npm run postman:refresh
```

Jika ingin menjalankan smoke test production via Newman:

```bash
npm run postman:smoke:prod
```

## OpenAPI and Swagger

Source spec OpenAPI ada di:

```text
docs/api/openapi.yaml
```

Swagger UI tersedia di runtime backend pada environment non-production. Di production, route `/docs` bisa saja dimatikan tergantung konfigurasi environment.

## Project Structure

```text
src/
  config/         runtime config, env, prisma, swagger
  constants/      enum dan constant domain
  controllers/    request-response handlers
  middlewares/    auth, error handler, guards
  repositories/   akses database Prisma
  routes/         route declarations
  services/       business logic
  utils/          helper, mappers, response builders
  validators/     validation schemas

prisma/
  schema.prisma   Prisma schema utama

db/
  migrations/     SQL/manual migration assets

scripts/
  db/             helper migration workflows
  seed/           local seed scripts
  postman/        Postman tooling
  smoke/          smoke/e2e verification scripts
  legacy/         parity/legacy scripts

docs/
  api/            OpenAPI dan API style guide
  frontend/       handoff dan contract FE
  deploy/         deployment guides
  architecture/   blueprint dan ERD
  operations/     recovery dan runbooks aktif
  archive/        historical docs

postman/
  collections dan environments untuk testing API
```

## ML Integration Notes

Beberapa hal penting untuk tim lain:

- Frontend **tidak** boleh memanggil microservice ML langsung.
- Frontend harus memanggil endpoint backend ini:
  - `ml-readiness`
  - `ml-predictions`
  - `ml-recommendations`
- Backend ini yang memutuskan apakah pasien sudah `ML-ready`.
- Payload 67 field NHANES/HFMS dibentuk internal oleh backend dari:
  - patient profile
  - ml profile
  - ml assessments
  - diary harian
  - body metrics
  - biometrics

## Deployment Notes

Untuk production sekarang, backend ini biasa dipasang bersama:

- PostgreSQL
- hfms-backend / ml-cnn-backend
- Nginx reverse proxy

Skenario yang sudah pernah dipakai:

- single-droplet deployment di DigitalOcean
- domain terpisah untuk:
  - `api.*` sebagai public app API
  - `ml.*` sebagai internal/admin-facing ML service

## Related Documentation

Kalau perlu pendalaman, dokumentasi aktif di repo dibagi seperti ini:

- `docs/frontend/` untuk handoff ke frontend
- `docs/deploy/` untuk deployment
- `docs/architecture/` untuk blueprint dan ERD
- `docs/operations/` untuk recovery dan operasional
- `docs/api/` untuk OpenAPI dan API style

## Notes for Contributors

- Gunakan struktur `docs/` yang sudah ada; jangan taruh dokumen aktif baru di root.
- Script baru sebaiknya masuk ke kategori yang sesuai di `scripts/`.
- Dokumen parity, migration notes lama, atau meeting notes historis masuk ke `docs/archive/`.
- Jika contract API berubah, update OpenAPI dan Postman examples.
