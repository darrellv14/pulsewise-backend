# Redis and CORS Notes for Current Production

Dokumen singkat ini mengunci dua keputusan penting untuk production PulseWise saat ini.

## Current API Domains

- `https://api.darrellvalentino.com`
- `https://ml.darrellvalentino.com`

Catatan penting:

- Kedua domain di atas adalah **domain backend/service**, bukan otomatis origin frontend.
- Aplikasi mobile native **tidak membutuhkan CORS** seperti browser.
- Untuk PulseWise saat ini, CORS production kemungkinan besar hanya relevan untuk **doctor dashboard berbasis web**.
- Untuk browser, CORS memakai **origin frontend**, bukan URL request lengkap.
- Jadi `CORS_ALLOWED_ORIGINS` **tidak** diisi dengan path seperti:
  - `https://api.darrellvalentino.com/api/v1`
  - `https://ml.darrellvalentino.com/api/v1`

Yang benar adalah origin saja, misalnya:

- `http://localhost:3000`
- `http://localhost:5173`
- `https://app.example.com`
- `https://staging.example.com`

## Current Recommendation for PulseWise

Karena app utama saat ini adalah **native mobile**, rekomendasi praktisnya:

- mobile app tetap memanggil `https://api.darrellvalentino.com/api/v1/...`
- CORS production dikunci untuk browser dashboard saja
- jika subdomain dashboard belum final, sementara cukup siapkan pola dan isi saat domain sudah diputuskan

Subdomain dashboard web yang dipakai saat ini:

- `https://pulsewise.darrellvalentino.com`
- `https://staging-pulsewise.darrellvalentino.com`

## Example `CORS_ALLOWED_ORIGINS`

Jika frontend tim memakai local + staging + production web, contoh:

```env
CORS_ALLOW_ALL=false
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://pulsewise.darrellvalentino.com,https://staging-pulsewise.darrellvalentino.com
CORS_CREDENTIALS=false
```

Jika browser frontend memang di-serve dari `api.darrellvalentino.com` atau `ml.darrellvalentino.com`, origin itu boleh dimasukkan, tapi **tetap tanpa `/api/v1`**:

```env
CORS_ALLOWED_ORIGINS=https://api.darrellvalentino.com,https://ml.darrellvalentino.com
```

Jika belum ada dashboard web production, nilai aman sementara:

```env
CORS_ALLOW_ALL=false
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=false
```

## Redis Production Decision

Untuk deployment sekarang, Redis production sebaiknya:

- dijalankan dengan Docker Compose
- memakai password
- tidak membuka port `6379` ke internet
- diakses backend lewat internal Docker network

Jangan gunakan:

```bash
docker run -d --name redis-server -p 6379:6379 redis
```

di VPS production, karena itu membuka Redis ke luar.

Lebih aman:

- Redis berjalan sebagai service internal Compose
- backend mengakses host `redis`
- password disimpan di env production

## Example Redis Env

```env
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=change_this_to_a_long_random_secret
REDIS_DB=0
REDIS_PREFIX=pw
```

Atau jika ingin satu URL:

```env
REDIS_URL=redis://:change_this_to_a_long_random_secret@redis:6379
```

## Quick Verify Commands

Masuk ke container Redis:

```bash
docker exec -it pulsewise-redis redis-cli
```

Lalu:

```text
AUTH <REDIS_PASSWORD>
PING
```

Atau one-shot:

```bash
docker exec -it pulsewise-redis redis-cli -a "<REDIS_PASSWORD>" PING
```
