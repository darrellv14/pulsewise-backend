# PulseWise Backend

Backend utama untuk ekosistem PulseWise yang melayani:
- aplikasi pasien
- dashboard dokter
- CMS edukasi
- integrasi machine learning

## Stack Utama

- Node.js
- Express.js
- PostgreSQL
- Redis
- Prisma ORM
- Docker / Docker Compose

## Struktur Dokumentasi yang Disisakan

Folder `docs` telah dirapikan dan hanya menyisakan artefak arsitektur inti:

- `docs/architecture/erd`
- `docs/architecture/uml`

Isi folder tersebut digunakan untuk kebutuhan diagram ERD dan Use Case Diagram sistem.

## Menjalankan Backend Lokal

```powershell
cd C:\Users\darre\Downloads\pulsewise-backend
C:\nvm4w\nodejs\npm.cmd start
```

Health check:

```text
http://127.0.0.1:5000/health
```

## Catatan

README ini sengaja dibuat ringkas agar repo tetap bersih dan fokus pada source code serta artefak arsitektur yang masih dipakai.
