# PulseWise Backend

Backend utama untuk aplikasi **PulseWise**. Repo ini menangani:

- autentikasi dan onboarding user
- profile pasien dan dokter
- relasi dokter-pasien dan dashboard monitoring
- diary pasien: body metrics, symptoms, activities, consumptions, sleep
- integrasi microservice ML HFMS v3
- ingestion biometrik time-series

## Stack

- Node.js + Express
- PostgreSQL
- Prisma
- Zod validation
- Jest + Supertest
- Swagger/OpenAPI

## Quick Start

1. Install dependency:

```bash
npm install
```

2. Siapkan environment:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Jalankan migrasi / bootstrap database:

```bash
npm run db:migrate
```

5. Jalankan backend:

```bash
npm run dev
```

## Commands Yang Paling Sering Dipakai

```bash
npm test
npm run lint
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:migrate
npm run seed:dev
npm run seed:dashboard
npm run seed:patient-care
npm run postman:refresh
npm run postman:smoke:prod
```

## Struktur Repo

```text
src/        aplikasi runtime
prisma/     schema Prisma
db/         migrasi SQL/manual
tests/      test suite
scripts/    helper scripts terkelompok
deploy/     template deploy production
docs/       dokumentasi aktif + archive
postman/    collection dan environment Postman
```

## Source Of Truth

- Docs index: [docs/README.md](docs/README.md)
- OpenAPI: [docs/api/openapi.yaml](docs/api/openapi.yaml)
- Frontend live guide: [docs/frontend/FRONTEND_LIVE_INTEGRATION_GUIDE.md](docs/frontend/FRONTEND_LIVE_INTEGRATION_GUIDE.md)
- ML blueprint: [docs/architecture/ML_HFMS_V3_BLUEPRINT.md](docs/architecture/ML_HFMS_V3_BLUEPRINT.md)
- Deploy guide: [docs/deploy/DIGITALOCEAN_SINGLE_DROPLET_DEPLOYMENT.md](docs/deploy/DIGITALOCEAN_SINGLE_DROPLET_DEPLOYMENT.md)
- VPS recovery: [docs/operations/VPS_RECOVERY_CHECKLIST.md](docs/operations/VPS_RECOVERY_CHECKLIST.md)

## Catatan Repo Hygiene

- `node_modules/` dan artefak lokal bukan bagian struktur repo resmi.
- Dokumen historis/parity/Django lama disimpan di `docs/archive/`.
- Script legacy/parity lama disimpan di `scripts/legacy/`.
