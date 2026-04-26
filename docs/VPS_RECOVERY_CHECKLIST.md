# VPS Recovery Checklist

Checklist ini dipakai kalau VPS diutak-atik lagi, deployment rusak, atau domain tiba-tiba berhenti melayani API dengan benar.

Target server saat ini:

- API: `https://api.darrellvalentino.com`
- ML: `https://ml.darrellvalentino.com`
- Root deploy dir: `/opt/pulsewise`

## 1. Gejala Yang Paling Umum

### Health check `500`

Kemungkinan terbesar:

- backend gagal login ke PostgreSQL
- env backend dan password database tidak sinkron
- volume Postgres masih menyimpan credential lama

### API `502` atau `504`

Kemungkinan terbesar:

- container `pulsewise-backend` down
- container `pulsewise-hfms-backend` down
- Nginx proxy salah arah
- HFMS timeout / crash

### Domain hidup tapi ML gagal

Kemungkinan terbesar:

- `ML_SERVICE_BASE_URL` salah
- HFMS container hidup tapi endpoint model gagal
- data pasien belum `ML-ready`

## 2. Perintah Diagnostik Cepat

Masuk ke server:

```bash
ssh root@168.144.44.43
```

Cek container:

```bash
cd /opt/pulsewise
docker compose -f docker-compose.prod.yml ps
```

Cek health backend:

```bash
curl -sS https://api.darrellvalentino.com/api/v1/health
```

Cek ML root:

```bash
curl -sS https://ml.darrellvalentino.com/
```

Cek log backend:

```bash
docker logs --tail 200 pulsewise-backend
```

Cek log Postgres:

```bash
docker logs --tail 200 pulsewise-postgres
```

Cek log HFMS:

```bash
docker logs --tail 200 pulsewise-hfms-backend
```

## 3. File Yang Menjadi Source Of Truth

Repo:

- `pulsewise-backend`
- `ml-cnn-backend`

Di server:

- `/opt/pulsewise/docker-compose.prod.yml`
- `/opt/pulsewise/deploy/pulsewise-backend.env`
- `/opt/pulsewise/deploy/hfms-backend.env`
- `/etc/nginx/sites-available/pulsewise`

Jangan edit kode container langsung di dalam image. Kalau perlu ubah source, ubah dari repo lalu redeploy.

## 4. Recovery Ringan

Pakai ini kalau:

- code sudah benar
- env tidak berubah
- hanya service yang crash atau Nginx perlu reload

Langkah:

```bash
cd /opt/pulsewise
docker compose -f docker-compose.prod.yml up -d --build
docker exec pulsewise-backend npm run migrate
systemctl reload nginx
```

## 5. Recovery Saat Ganti Env Tapi Database Masih Sama

Pakai ini kalau:

- Anda ubah domain, timeout, atau config non-DB
- Anda tidak mengganti credential Postgres

Langkah:

```bash
cd /opt/pulsewise
nano deploy/pulsewise-backend.env
nano deploy/hfms-backend.env
docker compose -f docker-compose.prod.yml up -d --build
docker exec pulsewise-backend npm run migrate
```

## 6. Recovery Saat Error Password Database

Gejala klasik:

- Prisma `Authentication failed against database server`
- Postgres log: `password authentication failed for user "pulsewise"`

Penyebab:

- `POSTGRES_PASSWORD` berubah setelah volume Postgres lama sudah terbentuk

Solusi aman:

1. Pastikan data lama memang boleh dihapus
2. Turunkan stack
3. Hapus volume Postgres
4. Deploy ulang dengan env yang konsisten

Perintah:

```bash
cd /opt/pulsewise
docker compose -f docker-compose.prod.yml down -v --remove-orphans
docker volume rm pulsewise_pulsewise_pgdata
docker compose -f docker-compose.prod.yml up -d --build
docker exec pulsewise-backend npm run migrate
docker exec pulsewise-backend npm run seed:dev
docker exec pulsewise-backend npm run seed:dashboard
docker exec pulsewise-backend npm run seed:patient-care
```

Catatan:

- hapus volume hanya kalau Anda siap kehilangan data yang ada di database container itu
- kalau nanti memakai DB production sungguhan berisi data real, prosedur ini harus diganti dengan rotasi password yang aman, bukan reset volume

## 7. Full Clean Redeploy Dari GitHub

Pakai ini kalau:

- kode di VPS berantakan
- env sudah tidak dipercaya
- Anda ingin rebuild dari kondisi bersih

Langkah:

```bash
cd /opt/pulsewise
docker compose -f docker-compose.prod.yml down -v --remove-orphans || true
rm -rf /opt/pulsewise/pulsewise-backend /opt/pulsewise/hfms-backend /opt/pulsewise/deploy
mkdir -p /opt/pulsewise/deploy
git clone github-pulsewise:darrellv14/pulsewise-backend.git /opt/pulsewise/pulsewise-backend
git clone github-mlcnn:darrellv14/ml-cnn-backend.git /opt/pulsewise/hfms-backend
```

Lalu tulis ulang:

- `/opt/pulsewise/docker-compose.prod.yml`
- `/opt/pulsewise/deploy/pulsewise-backend.env`
- `/opt/pulsewise/deploy/hfms-backend.env`

Kemudian:

```bash
cd /opt/pulsewise
docker compose -f docker-compose.prod.yml up -d --build
docker exec pulsewise-backend npm run migrate
docker exec pulsewise-backend npm run seed:dev
docker exec pulsewise-backend npm run seed:dashboard
docker exec pulsewise-backend npm run seed:patient-care
systemctl reload nginx
```

## 8. File Nginx Yang Dipakai

Untuk domain live:

- `deploy/nginx/pulsewise-domains.conf`

Upload ke server:

```bash
scp deploy/nginx/pulsewise-domains.conf root@168.144.44.43:/etc/nginx/sites-available/pulsewise
ssh root@168.144.44.43 "ln -sf /etc/nginx/sites-available/pulsewise /etc/nginx/sites-enabled/pulsewise && nginx -t && systemctl reload nginx"
```

## 9. Smoke Test Setelah Recovery

### Health

```bash
curl -sS https://api.darrellvalentino.com/api/v1/health
curl -sS https://ml.darrellvalentino.com/
```

### App smoke

```bash
docker exec pulsewise-backend node scripts/smoke-live.js
```

### Full ML smoke

```bash
docker exec pulsewise-backend node scripts/smoke-hfms-e2e.js
```

## 10. Larangan Praktis

Jangan:

- ganti password Postgres di env tanpa memahami dampaknya ke volume lama
- edit langsung file random di dalam container
- edit source di VPS tanpa commit ke GitHub
- jadikan `ml.darrellvalentino.com` sebagai base URL utama frontend

Lakukan:

- ubah source di repo
- commit dan push
- pull/clone di VPS
- rebuild
- migrate
- smoke test

## 11. Data QA Yang Tersedia

Setelah seed standar:

- Patient: `seed.patient2@pulsewise.local` / `dev12345`
- Doctor: `doctor@pulsewise.local` / `dev12345`

Gunakan akun ini untuk smoke test cepat setelah recovery.
