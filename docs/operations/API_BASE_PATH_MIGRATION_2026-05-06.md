# API Base Path Migration - 2026-05-06

Dokumen ini menjelaskan breaking change base path API PulseWise yang diberlakukan pada 6 Mei 2026.

## Ringkasan

Path canonical API sekarang **tidak lagi memakai prefix `/api/v1`**.

Contoh:

- lama: `POST /api/v1/auth/login`
- baru: `POST /auth/login`

- lama: `GET /api/v1/health`
- baru: `GET /health`

- lama: `GET /api/v1/doctors/{doctorId}/dashboard/patients`
- baru: `GET /doctors/{doctorId}/dashboard/patients`

## Apa Saja Yang Berubah

1. Runtime Express sekarang mount API di root path.
2. OpenAPI canonical di [openapi.yaml](../api/openapi.yaml) sudah diubah ke path tanpa prefix versi.
3. Postman environment canonical sekarang memakai:
   - local: `http://localhost:5000`
   - production: `https://api.darrellvalentino.com`
4. Smoke scripts dan parity tooling juga sudah diarahkan ke base path baru.
5. Pairing session `pollingPath` sekarang mengembalikan path tanpa `/api/v1`.

## Dampak ke Frontend

- Semua base URL FE yang sebelumnya menunjuk ke `https://api.darrellvalentino.com/api/v1` harus diubah menjadi `https://api.darrellvalentino.com`.
- Semua request path yang sebelumnya diawali `/api/v1` harus diganti ke root path langsung.
- CORS tidak berubah konsepnya; yang berubah hanya **request path**, bukan **origin**.

## Dampak ke Tooling

- Collection Postman canonical sudah diperbarui.
- Environment Postman canonical sudah diperbarui.
- Swagger/OpenAPI canonical sudah diperbarui.
- Smoke script canonical sudah diperbarui.
- Vercel Git auto-deploy dinonaktifkan di [vercel.json](../../vercel.json) karena jalur deploy production backend utama sekarang lewat VPS.

## Catatan Tentang VS Code Postman Extension

Collection dan environment file di repo ini tetap bisa dibuka/import dari extension Postman di VS Code.

Namun, **auto sync ke Postman cloud workspace tidak bisa dipaksa hanya dari file repo** tanpa:

- login Postman di extension/desktop app
- workspace target yang jelas
- atau kredensial API/akses workspace jika ingin push otomatis

Untuk sekarang, source of truth-nya tetap file JSON di folder `postman/` yang direfresh lewat:

```bash
npm run postman:refresh
npm run postman:sync-examples
```
