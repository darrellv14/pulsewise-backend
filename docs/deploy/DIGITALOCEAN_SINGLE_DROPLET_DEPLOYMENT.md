# PulseWise DigitalOcean Deployment Guide

## Scope
Panduan ini untuk skenario:
- `1 Droplet DigitalOcean`
- RAM `8 GB`
- komponen dijalankan di satu mesin:
- `pulsewise-backend` (Node.js + Express)
- `hfms-backend` (Python Flask ML microservice)
- `PostgreSQL`
- `Redis`
- `Nginx` sebagai reverse proxy

Panduan ini cocok untuk:
- tugas akhir
- MVP
- staging / early production

Panduan ini belum ditujukan untuk:
- high availability
- autoscaling
- zero-downtime multi-node deployment

## Executive Summary
Arsitektur yang direkomendasikan untuk `1 droplet 8 GB`:

1. Frontend mobile / web **hanya memanggil `pulsewise-backend`**.
2. `pulsewise-backend` menyimpan dan membaca data dari PostgreSQL.
3. `pulsewise-backend` memanggil `hfms-backend` secara internal untuk prediction dan recommendation.
4. `hfms-backend` **tidak perlu dipanggil langsung oleh frontend**.
5. `Redis` dipakai internal untuk rate limit dan selective cache.
6. Semua service berjalan di Docker.
7. `Nginx` menangani domain, HTTPS, dan reverse proxy.

## Recommended Topology

### Public endpoints
- `api.pulsewise.yourdomain.com` -> `pulsewise-backend`
- `ml.pulsewise.yourdomain.com` -> `hfms-backend`

Catatan:
- Untuk frontend produksi, saya tetap merekomendasikan frontend **hanya memakai `api.*`**.
- `ml.*` dipertahankan untuk kebutuhan admin, smoke test, dan debugging.
- Jika mau lebih ketat, `ml.*` bisa dibatasi hanya internal / IP tertentu.

### Internal service flow
```text
Frontend App / Dashboard
        |
        v
api.pulsewise.yourdomain.com
        |
        v
PulseWise Express Backend
        |
        +--> PostgreSQL
        |
        +--> Redis
        |
        +--> hfms-backend (internal call)
```

## Is 8 GB Enough?
Ya, untuk kondisi sekarang **cukup**.

Dengan asumsi:
- user belum sangat besar
- request ML tidak sangat paralel
- PostgreSQL masih satu node lokal
- belum ada worker/background jobs berat tambahan

Perkiraan aman untuk awal:
- `pulsewise-backend`: ringan
- `hfms-backend`: paling berat saat recommendation
- `PostgreSQL`: moderat
- `Nginx`: ringan

Yang perlu diwaspadai:
- recommendation ML lebih berat dari prediction
- jika banyak request recommendation paralel, RAM dan CPU akan naik
- backup database harus disiplin karena semua berada di satu droplet

## Recommended Server Layout
Gunakan struktur sibling repo di droplet:

```text
/opt/pulsewise/
  pulsewise-backend/
  hfms-backend/
  deploy/
```

Contoh:
- `/opt/pulsewise/pulsewise-backend`
- `/opt/pulsewise/hfms-backend`
- `/opt/pulsewise/deploy/docker-compose.prod.yml`

## What Runs Where

### `pulsewise-backend`
Tanggung jawab:
- auth
- profile pasien
- diary
- biometrics
- dashboard dokter
- ML readiness
- payload mapping 67 field
- bridge ke `hfms-backend`

### `hfms-backend`
Tanggung jawab:
- `POST /v3/predictions/`
- `POST /v3/recommendations/`
- proses model ML
- genetic algorithm recommendation

### `PostgreSQL`
Tanggung jawab:
- seluruh data aplikasi PulseWise
- data dashboard dokter
- ML support data yang dibutuhkan mapper

## What Frontend Calls

### Mobile app / patient app
Frontend memanggil `pulsewise-backend`, misalnya:
- `/auth/*`
- `/patients/:patientId/profile`
- `/users/:userId/diaries/by-date/*`
- `/users/:userId/ml-readiness`
- `/users/:userId/ml-predictions`
- `/users/:userId/ml-recommendations`

### Dashboard dokter
Frontend dashboard dokter juga memanggil `pulsewise-backend`, misalnya:
- `/doctors/:doctorId/dashboard/patients`
- `/doctors/:doctorId/dashboard/patients/:patientId`
- `/doctors/:doctorId/dashboard/patients/:patientId/vitals`
- `/doctors/:doctorId/dashboard/patients/:patientId/abnormal-report`
- `/doctors/:doctorId/dashboard/patients/:patientId/ml-readiness`
- `/doctors/:doctorId/dashboard/patients/:patientId/ml-predictions`
- `/doctors/:doctorId/dashboard/patients/:patientId/ml-recommendations`

Kesimpulan penting:
- dashboard dokter **tidak** memanggil Flask ML langsung
- prediksi dan recommendation tetap bisa dipakai frontend karena di-bridge oleh backend Express

## Production Decision for 1 Droplet
Untuk 1 droplet, saya merekomendasikan:

1. Jalankan `PostgreSQL`, `pulsewise-backend`, dan `hfms-backend` di Docker.
2. Jalankan `Redis` di Docker internal network, pakai password, tanpa expose port publik.
3. Jalankan `Nginx` di host mesin, bukan di container, agar TLS dan reverse proxy lebih mudah.
4. Gunakan `ufw` untuk hanya membuka:
   - `22`
   - `80`
   - `443`
5. Jangan expose port `5432`, `5000`, `8080`, `6379` ke internet.
6. Reverse proxy dari Nginx ke:
   - `127.0.0.1:5000` untuk Express
   - `127.0.0.1:8080` untuk HFMS

## CORS Rule for Current Production

Browser CORS harus memakai **origin frontend**, bukan URL API lengkap.

Contoh yang salah:

- `https://api.darrellvalentino.com/api/v1`
- `https://ml.darrellvalentino.com/api/v1`

Contoh yang benar:

- `https://pulsewise.darrellvalentino.com`
- `https://staging-pulsewise.darrellvalentino.com`
- `http://localhost:3000`
- `http://localhost:5173`

Jika browser frontend memang di-serve langsung dari domain API/ML, origin itu boleh diisi tanpa path:

- `https://api.darrellvalentino.com`
- `https://ml.darrellvalentino.com`

## Step-by-Step Deployment

### 1. Create droplet
Rekomendasi:
- Ubuntu `22.04` atau `24.04`
- Basic droplet `8 GB RAM`
- region dekat user utama

Checklist:
- tambahkan SSH key
- jangan login root untuk operasional harian

### 2. Prepare DNS
Buat `A record`:
- `api.pulsewise.yourdomain.com` -> IP droplet
- `ml.pulsewise.yourdomain.com` -> IP droplet

### DNS Setup (Current Production Example)

Untuk domain production saat ini, gunakan:

- `api.darrellvalentino.com` -> `168.144.44.43`
- `ml.darrellvalentino.com` -> `168.144.44.43`

Verifikasi propagasi:

```bash
dig +short api.darrellvalentino.com
dig +short ml.darrellvalentino.com
```

### 3. Initial server setup
Masuk ke server lalu jalankan:

```bash
sudo apt update && sudo apt upgrade -y
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo mkdir -p /opt/pulsewise
sudo chown -R deploy:deploy /opt/pulsewise
```

Pindah ke user deploy.

### 4. Install Docker
Contoh:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
newgrp docker
docker --version
docker compose version
```

### 5. Install Nginx and Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 6. Clone repos
```bash
cd /opt/pulsewise
git clone <repo-pulsewise-backend-url> pulsewise-backend
git clone <repo-hfms-backend-url> hfms-backend
mkdir -p deploy
```

## Recommended Production Compose
Buat file:
- `/opt/pulsewise/deploy/docker-compose.prod.yml`

Contoh:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: pulsewise-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: pulsewise
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: pulsewise
    volumes:
      - pulsewise_pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pulsewise -d pulsewise"]
      interval: 10s
      timeout: 5s
      retries: 5

  pulsewise-backend:
    build:
      context: /opt/pulsewise/pulsewise-backend
      dockerfile: Dockerfile
    container_name: pulsewise-backend
    restart: unless-stopped
    env_file:
      - /opt/pulsewise/deploy/pulsewise-backend.env
    depends_on:
      postgres:
        condition: service_healthy
      hfms-backend:
        condition: service_started
    ports:
      - "127.0.0.1:5000:5000"

  hfms-backend:
    build:
      context: /opt/pulsewise/hfms-backend
      dockerfile: Dockerfile
    container_name: pulsewise-hfms-backend
    restart: unless-stopped
    env_file:
      - /opt/pulsewise/deploy/hfms-backend.env
    ports:
      - "127.0.0.1:8080:8080"

volumes:
  pulsewise_pgdata:
```

Catatan penting:
- semua port dibind ke `127.0.0.1`, jadi tidak langsung terbuka ke internet
- akses publik hanya lewat Nginx

## Environment Files

### `/opt/pulsewise/deploy/pulsewise-backend.env`
Contoh minimal:

```env
PORT=5000
NODE_ENV=production

JWT_SECRET=replace_with_real_long_secret
JWT_EXPIRES_IN=1d
OTP_EXPIRES_MINUTES=10
OTP_DEBUG_EXPOSE=false

DATABASE_URL=postgresql://pulsewise:YOUR_DB_PASSWORD@postgres:5432/pulsewise
DIRECT_DATABASE_URL=postgresql://pulsewise:YOUR_DB_PASSWORD@postgres:5432/pulsewise
DIRECT_URL=postgresql://pulsewise:YOUR_DB_PASSWORD@postgres:5432/pulsewise
PRISMA_ACCELERATE_ENABLED=false

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=pulsewise
POSTGRES_USER=pulsewise
POSTGRES_PASSWORD=YOUR_DB_PASSWORD
POSTGRES_SSL=false
POSTGRES_SSL_REJECT_UNAUTHORIZED=false

ML_SERVICE_BASE_URL=http://hfms-backend:8080
ML_SERVICE_TIMEOUT_MS=30000
ML_SERVICE_VERSION=3

GOOGLE_CLIENT_ID=
MAILTRAP_TOKEN=
MAILTRAP_SENDER_EMAIL=
MAILTRAP_SENDER_NAME=PulseWise

CLOUDINARY_URL=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_FOLDER=pulsewise/avatar

FIREBASE_PROJECT_ID=
```

### `/opt/pulsewise/deploy/hfms-backend.env`
Contoh yang direkomendasikan dari hasil uji:

```env
HFMS_GA_POPULATION_SIZE=12
HFMS_GA_GENERATIONS=10
HFMS_GA_MUTATION_PROBABILITY=0.2
```

Alasan:
- latency recommendation lebih masuk akal
- prediction tetap cepat
- kualitas recommendation masih tetap usable untuk flow aplikasi

## Nginx Reverse Proxy

Jika ingin langsung pakai domain production saat ini, gunakan template:

- `deploy/nginx/pulsewise.darrellvalentino.com.conf`

Lalu pasang ke server, misalnya:

```bash
sudo cp /opt/pulsewise/pulsewise-backend/deploy/nginx/pulsewise.darrellvalentino.com.conf /etc/nginx/sites-available/pulsewise
sudo ln -sf /etc/nginx/sites-available/pulsewise /etc/nginx/sites-enabled/pulsewise
sudo nginx -t
sudo systemctl reload nginx
```

### `api.pulsewise.yourdomain.com`
Contoh:

```nginx
server {
    server_name api.pulsewise.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### `ml.pulsewise.yourdomain.com`
Contoh:

```nginx
server {
    server_name ml.pulsewise.yourdomain.com;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Enable HTTPS
Setelah DNS aktif dan Nginx config benar:

```bash
sudo certbot --nginx -d api.pulsewise.yourdomain.com
sudo certbot --nginx -d ml.pulsewise.yourdomain.com
```

Untuk domain production saat ini:

```bash
sudo certbot --nginx -d api.darrellvalentino.com -d ml.darrellvalentino.com
```

Verifikasi:

```bash
curl -I https://api.darrellvalentino.com/api/v1/health
curl -I https://ml.darrellvalentino.com/
```

## Build and Start Containers
```bash
cd /opt/pulsewise/deploy
docker compose -f docker-compose.prod.yml up -d --build
```

## Run Database Migration
Setelah container hidup:

```bash
docker exec -it pulsewise-backend npm run migrate
```

Opsional bila perlu generate client:

```bash
docker exec -it pulsewise-backend npx prisma generate
```

## Smoke Test Checklist

### Backend health
```bash
curl https://api.pulsewise.yourdomain.com/api/v1/health
```

### HFMS health
```bash
curl https://ml.pulsewise.yourdomain.com/
```

### PulseWise login
Test:
- `POST /api/v1/auth/login`

### Dashboard dokter
Test:
- `GET /api/v1/doctors/:doctorId/dashboard/patients`
- `GET /api/v1/doctors/:doctorId/dashboard/patients/:patientId`

### ML patient flow
Test:
- `GET /api/v1/users/:userId/ml-readiness`
- `GET /api/v1/users/:userId/ml-payload`
- `POST /api/v1/users/:userId/ml-predictions`
- `POST /api/v1/users/:userId/ml-recommendations`

### ML doctor dashboard flow
Test:
- `GET /api/v1/doctors/:doctorId/dashboard/patients/:patientId/ml-readiness`
- `POST /api/v1/doctors/:doctorId/dashboard/patients/:patientId/ml-predictions`
- `POST /api/v1/doctors/:doctorId/dashboard/patients/:patientId/ml-recommendations`

## Security Checklist
- jangan expose `5432` ke publik
- jangan expose `5000` ke publik
- jangan expose `8080` ke publik
- gunakan `ufw`
- gunakan HTTPS
- simpan `.env` di server, jangan commit ke repo
- gunakan `JWT_SECRET` yang panjang dan unik
- backup volume PostgreSQL

Contoh `ufw`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

## Backup Strategy
Karena semua ada dalam 1 droplet, backup itu wajib.

Minimal:
- backup database harian
- snapshot droplet berkala

Contoh backup SQL:

```bash
docker exec pulsewise-postgres pg_dump -U pulsewise pulsewise > pulsewise-backup.sql
```

Lebih baik:
- kirim hasil backup ke DigitalOcean Spaces atau storage lain

## Update / Redeploy Flow
Saat ada perubahan:

```bash
cd /opt/pulsewise/pulsewise-backend
git pull

cd /opt/pulsewise/hfms-backend
git pull

cd /opt/pulsewise/deploy
docker compose -f docker-compose.prod.yml up -d --build
docker exec -it pulsewise-backend npm run migrate
```

## Recommended Operational Rules
- frontend hanya pakai `api.*`
- backend Express yang memanggil `hfms-backend`
- jangan biarkan mobile app / dashboard memanggil `ml.*` langsung kecuali untuk admin test
- semua auth dan authorization tetap di Express

## Known Tradeoffs of 1 Droplet
- jika droplet mati, semua service ikut mati
- database dan ML berbagi resource mesin yang sama
- backup dan monitoring jadi sangat penting
- scaling nanti akan lebih sulit dibanding arsitektur multi-service multi-host

## Future Upgrade Path
Jika traffic naik, urutan upgrade paling aman:

1. pindahkan PostgreSQL ke managed database
2. pindahkan `hfms-backend` ke droplet / service terpisah
3. pertahankan `pulsewise-backend` sebagai API gateway utama

## Final Recommendation
Untuk saat ini, `1 droplet 8 GB` adalah pilihan yang masuk akal.

Konfigurasi yang saya sarankan:
- `pulsewise-backend` + `hfms-backend` + `PostgreSQL` di 1 droplet
- `Nginx` sebagai reverse proxy
- frontend hanya ke `pulsewise-backend`
- `hfms-backend` dipanggil internal oleh Express
- `HFMS_GA_POPULATION_SIZE=12`
- `HFMS_GA_GENERATIONS=10`
- `ML_SERVICE_TIMEOUT_MS=30000`

Dengan setup ini:
- dashboard dokter tetap bisa dipanggil frontend
- prediction dan recommendation tetap bisa dipanggil frontend lewat backend Express
- microservice ML tetap terpisah secara arsitektur walaupun masih berada di 1 mesin yang sama
