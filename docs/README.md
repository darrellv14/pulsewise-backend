# PulseWise Docs Map

Ini adalah peta dokumen canonical yang masih aktif dipakai tim.

## Canonical Docs

- API contract:
  - [OpenAPI spec](./api/openapi.yaml)
  - [API style guide](./api/API_STYLE_GUIDE.md)
- Architecture:
  - [Architecture docs index](./architecture/README.md)
  - [ML HFMS v3 blueprint](./architecture/ML_HFMS_V3_BLUEPRINT.md)
  - [Second ML integration guide](./architecture/SECOND_ML_INTEGRATION_GUIDE.md)
- Frontend handoff:
  - [Frontend integration guide](./frontend/FRONTEND_INTEGRATION_GUIDE.md)
  - [Frontend live integration guide](./frontend/FRONTEND_LIVE_INTEGRATION_GUIDE.md)
  - [Frontend production handoff](./frontend/FRONTEND_PRODUCTION_HANDOFF.md)
- Operations:
  - [Refactor implementation TODO](./operations/REFACTOR_IMPLEMENTATION_TODO.md)
  - [API base-path migration note](./operations/API_BASE_PATH_MIGRATION_2026-05-06.md)
  - [Dependency audit 2026-05-06](./operations/DEPENDENCY_AUDIT_2026-05-06.md)
  - [API contract PR checklist](./operations/API_CONTRACT_PR_CHECKLIST.md)
  - [VPS recovery checklist](./operations/VPS_RECOVERY_CHECKLIST.md)
- Deploy:
  - [DigitalOcean single droplet deployment](./deploy/DIGITALOCEAN_SINGLE_DROPLET_DEPLOYMENT.md)
  - [Redis and CORS notes](./deploy/REDIS_AND_CORS_NOTES.md)

## Archive Policy

Folder [archive](./archive) berisi catatan historis, parity notes, dan handoff lama.

- Treat as reference only
- Do not use as source of truth for current API contract
- If a statement in `archive/` conflicts with docs canonical above, follow the canonical docs
