# Dependency Audit - 2026-05-06

Dokumen ini mencatat hasil triase dependency setelah refactor besar dan pass hardening lanjutan.

## Ringkasan

- Audit awal: `74` vulnerability total, termasuk `7 critical`
- Setelah triase:
  - `npm audit`: `59` total, `0 critical`
  - `npm audit --omit=dev`: `11` total (`9 high`, `2 moderate`)
- Test suite dan lint tetap hijau setelah update dependency

## Perubahan yang dilakukan

- Update dependency direct yang memiliki patch aman:
  - `@prisma/extension-accelerate` -> `^2.0.2`
  - `dotenv` -> `^17.4.2`
  - `google-auth-library` -> `^10.6.2`
  - `mailtrap` -> `^4.5.1`
  - `redis` -> `^5.12.1`
  - `zod` -> `^4.4.3`
  - `prettier` -> `^3.8.3`
- Hapus dependency tidak terpakai:
  - `firebase-admin`
- Pindahkan dependency tooling docs ke `devDependencies`:
  - `swagger-ui-express`
  - `yamljs`
- Runtime docs Swagger dibuat lazy-load agar tool docs tidak ikut dibutuhkan di production startup

## Sisa vulnerability production

### 1. Prisma / Accelerate chain

Dependency yang masih terlibat:

- `@prisma/client`
- `prisma`
- `@prisma/config`
- `effect`
- `@prisma/extension-accelerate`

Status:

- masih dilaporkan `high`
- `fixAvailable: false`
- perlu menunggu upstream Prisma / Effect merilis patch yang kompatibel

### 2. Express router / path-to-regexp

Dependency yang masih terlibat:

- `express`
- `router`
- `path-to-regexp`

Status:

- masih dilaporkan `high`
- `fixAvailable: false`
- belum ada update direct yang bisa diambil tanpa menunggu upstream dependency tree Express

### 3. Mailtrap SDK chain

Dependency yang masih terlibat:

- `mailtrap`
- `axios`
- `follow-redirects`

Status:

- masih `high/moderate`
- `fixAvailable: false`
- kalau ingin mengurangi surface ini lebih jauh, kandidat refactor berikutnya adalah mengganti SDK `mailtrap` dengan client HTTP internal yang memakai `fetch`

## Rekomendasi berikutnya

1. Pantau release upstream Prisma / Express untuk audit fix yang resmi.
2. Pertimbangkan mengganti `mailtrap` SDK dengan wrapper internal berbasis `fetch`.
3. Jalankan audit ulang setelah setiap bump dependency penting.
4. Jangan paksa `npm audit fix --force` karena berisiko mematahkan contract runtime tanpa benefit yang jelas.
