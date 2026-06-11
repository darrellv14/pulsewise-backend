# Laporan Stress Test Production Backend PulseWise

Tanggal pelaksanaan: 12 Juni 2026  
Target environment: VPS production aktif (`72.62.125.129`) melalui backend lokal `http://127.0.0.1:5000`  
Metode uji: `k6` via Docker (`grafana/k6`) langsung dari host VPS

## 1. Tujuan Pengujian

Pengujian ini dilakukan untuk menjawab dua kebutuhan utama:

1. memastikan cohort akun uji pada production benar-benar siap untuk alur ML HFMS;
2. mengukur kapasitas backend production pada trafik REST umum dan trafik ML yang lebih tinggi dari smoke test sebelumnya.

Endpoint estimasi nutrisi berbasis foto makanan / Gemini **tidak** disertakan dalam pengujian.

## 2. Persiapan Cohort ML-Ready

Sebelum stress test dijalankan, backend production disiapkan dengan cohort uji khusus:

- doctor load test: `load.doctor@pulsewise.local`
- patient cohort: `load.patient001@pulsewise.local` s.d. `load.patient200@pulsewise.local`
- password cohort: `dev12345`

Seeder yang digunakan:

- `scripts/seed/seed-load-test-cohort.js`

Perbaikan penting pada seeder:

- seeder sekarang tidak hanya membuat akun dan diary;
- seeder juga memverifikasi readiness menggunakan jalur backend yang sama dengan production (`getStrictMlPayload`);
- hasil verifikasi menunjukkan **200 dari 200 akun** cohort berhasil `ML-ready`.

Smoke verifikasi satu sampel cohort:

- `GET /users/{userId}/ml-readiness` -> `200`
- `POST /users/{userId}/ml-predictions` -> `200`
- `POST /users/{userId}/ml-recommendations` -> `200`

## 3. Catatan Konfigurasi Pengujian

Untuk pengujian REST dan ML dengan VU yang lebih tinggi, rate limiting backend production **dinonaktifkan sementara** agar hasil yang diperoleh merepresentasikan kapasitas aplikasi inti, bukan tertahan oleh limiter login dari satu host pengujian.

Setelah seluruh pengujian selesai:

- konfigurasi env production dipulihkan ke kondisi semula;
- backend direcreate kembali;
- health check production kembali `healthy`.

## 4. Skenario Pengujian

### 4.1 REST Cohort Heavy

Script:

- `scripts/loadtest/k6-production-rest-cohort-heavy.js`

Pola beban:

- naik ke 50 VU
- naik ke 100 VU
- naik ke 150 VU

Endpoint yang diuji per iterasi:

- `POST /auth/login` pada awal tiap VU
- `GET /auth/me`
- `GET /users/{userId}/dashboard`
- `GET /users/{userId}/medications`
- `GET /users/{userId}/medications/calendar`
- `GET /users/{userId}/diaries/by-date`
- `GET /users/{userId}/ml-readiness`

### 4.2 ML Cohort Heavy

Script:

- `scripts/loadtest/k6-production-ml-cohort-heavy.js`

Pola beban:

- naik ke 10 VU
- naik ke 20 VU
- naik ke 30 VU

Endpoint yang diuji per iterasi:

- `POST /users/{userId}/ml-predictions`
- `POST /users/{userId}/ml-recommendations`

## 5. Hasil Pengujian

### 5.1 Hasil REST Cohort Heavy

| Metrik | Hasil |
|---|---:|
| Max VUs | 150 |
| Total request | 86.322 |
| Request rate | 400,41 req/s |
| Failure rate | 0,00% |
| Avg latency | 55,67 ms |
| Median latency | 37,44 ms |
| P95 latency | 148,55 ms |
| Max latency | 591,52 ms |
| Total iterasi | 14.362 |

Latency per endpoint:

| Endpoint | Avg | P95 | Max |
|---|---:|---:|---:|
| `GET /auth/me` | 46,68 ms | 124,39 ms | 323,98 ms |
| `GET /users/{userId}/dashboard` | 57,51 ms | 161,79 ms | 591,52 ms |
| `GET /users/{userId}/medications` | 45,59 ms | 125,32 ms | 348,73 ms |
| `GET /users/{userId}/medications/calendar` | 61,14 ms | 163,05 ms | 359,40 ms |
| `GET /users/{userId}/diaries/by-date` | 58,08 ms | 165,05 ms | 542,34 ms |
| `GET /users/{userId}/ml-readiness` | 64,59 ms | 143,37 ms | 349,10 ms |

Kesimpulan REST:

- seluruh request berhasil (`100% success`);
- backend production stabil hingga `150 concurrent VUs`;
- throughput efektif mencapai sekitar `400 req/s`;
- latency P95 tetap rendah, masih di bawah `150 ms`.

### 5.2 Hasil ML Cohort Heavy

| Metrik | Hasil |
|---|---:|
| Max VUs | 30 |
| Total request | 324 |
| Request rate | 1,80 req/s |
| Failure rate | 0,00% |
| Avg latency | 9,18 s |
| Median latency | 9,14 s |
| P95 latency | 20,03 s |
| Max latency | 23,58 s |
| Total iterasi | 137 |

Latency per endpoint:

| Endpoint | Avg | P95 | Max |
|---|---:|---:|---:|
| `POST /users/{userId}/ml-predictions` | 9,83 s | 19,80 s | 23,58 s |
| `POST /users/{userId}/ml-recommendations` | 10,44 s | 20,90 s | 23,44 s |

Kesimpulan ML:

- seluruh request berhasil (`100% success`);
- tidak ada error fungsional pada jalur ML production;
- bottleneck utama ada pada **latency**, bukan kegagalan request;
- pada `30 concurrent VUs`, endpoint rekomendasi mulai melewati ambang nyaman `20 detik`.

## 6. Interpretasi Teknis

Berdasarkan hasil production test ini, dapat disimpulkan bahwa:

1. **Lapisan REST production sangat kuat.**  
   Pada beban `150 VUs`, backend tetap mencatat `0,00%` failure rate dengan `P95 148,55 ms`, yang berarti modul aplikasi harian masih sangat responsif.

2. **Jalur ML production stabil, tetapi lebih mahal secara waktu komputasi.**  
   Seluruh request prediksi dan rekomendasi tetap berhasil, namun waktu tunggu meningkat cukup tajam ketika concurrency naik ke `30 VUs`.

3. **Masalah readiness awal bukan berasal dari service ML yang rusak.**  
   Akar masalahnya adalah cohort production sebelumnya belum diseed ulang sesuai kebutuhan mapper backend terbaru. Setelah cohort `ML-ready` dibuat dan diverifikasi, jalur ML dapat dieksekusi normal.

4. **Limiter login dapat mengganggu pembacaan stress test jika tidak dipisahkan dari tujuan uji.**  
   Untuk uji kapasitas murni, rate limiting perlu diperlakukan sebagai lapisan proteksi terpisah, bukan indikator kapasitas business flow inti.

## 7. Rekomendasi

1. gunakan cohort `load.patient001` s.d. `load.patient200` sebagai basis pengujian production-local berikutnya;
2. pertahankan pendekatan verifikasi readiness di seeder agar cohort uji tidak diam-diam menjadi usang;
3. untuk beban REST, kapasitas `150 VUs` sudah aman dan masih longgar;
4. untuk beban ML, `20-30 VUs` adalah area yang sudah layak diuji tetapi mulai menunjukkan kenaikan latensi yang signifikan;
5. bila trafik ML riil diperkirakan tumbuh, optimasi sebaiknya diarahkan ke:
   - antrean / background processing,
   - pemisahan worker inferensi,
   - efisiensi orchestration request ke HFMS,
   - caching readiness dan snapshot pendukung non-inferensi.

## 8. Artefak

Artefak hasil yang tersimpan pada host production:

- `/tmp/k6-results/rest-prod-summary.json`
- `/tmp/k6-results/ml-prod-summary.json`
- `/tmp/k6-results/rest-prod-cohort-heavy-summary.json`
- `/tmp/k6-results/ml-prod-cohort-heavy-summary.json`
