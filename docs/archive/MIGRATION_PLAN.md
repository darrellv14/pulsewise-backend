# Migration Plan v1

## Objective

Menyiapkan schema PostgreSQL awal yang langsung mendukung:

- Auth + RBAC
- Patient-doctor relationship
- Health diary
- Telemetry time-series
- ML prediction + early warning

## Ordering

1. Create extension + base metadata table (`schema_migrations`).
2. Create auth and profile tables (`roles`, `users`, `user_roles`, `doctor_profiles`, `patient_profiles`).
3. Create relationship tables (`doctor_patients`, `patient_shares`).
4. Create diary and medication tables.
5. Create telemetry + prediction + alert tables.
6. Create indexes for high-frequency access patterns.
7. Seed base roles.

## Files

- `db/migrations/0001_init_schema.sql`
- `db/migrations/0002_seed_roles.sql`

## Rollout Steps

1. Start Docker PostgreSQL.
2. Copy `.env.example` to `.env` and adjust if needed.
3. Run `npm run migrate`.
4. Verify tables and seed data.
