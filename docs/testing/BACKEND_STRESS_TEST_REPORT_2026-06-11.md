# Laporan Stress Test Backend PulseWise

Tanggal pelaksanaan: 11 Juni 2026  
Metode uji: `k6` via Docker (`grafana/k6`)  
Jenis uji: stress test bertahap untuk endpoint REST umum dan endpoint ML

## 1. Tujuan Pengujian

Pengujian ini dilakukan untuk mengukur stabilitas dan performa backend PulseWise di bawah beban bertahap, dengan fokus pada:

1. endpoint operasional utama aplikasi;
2. endpoint integrasi machine learning HFMS;
3. batas aman layanan sebelum latensi mulai meningkat signifikan.

Endpoint estimasi nutrisi berbasis foto makanan/Gemini sengaja **tidak** dimasukkan ke stress test, karena endpoint tersebut bergantung pada layanan multimodal eksternal, memiliki cost per request, dan bukan jalur yang tepat untuk dibebani secara agresif pada pengujian ini.

## 2. Lingkungan Pengujian

Pengujian dijalankan pada environment lokal terkendali dengan konfigurasi:

- Backend PulseWise: `http://localhost:5001`
- PostgreSQL: `localhost:5433`
- Redis: aktif
- HFMS backend / ML service: `http://localhost:8080`
- Data uji: 200 akun cohort hasil `npm run seed:load-test`

Pengaturan sementara saat stress test:

- `RATE_LIMIT_ENABLED=false`
- `REDIS_ENABLED=true`
- `AUTH_RECHECK_USER=false`
- `FCM_SCHEDULER_ENABLED=false`
- `MEDICATION_REMINDER_CRON_ENABLED=false`

Tujuan pengaturan tersebut adalah agar hasil uji merepresentasikan performa service utama tanpa bias dari pembatasan trafik, scheduler notifikasi, atau lookup autentikasi tambahan di setiap request protected route.

## 3. Skenario Pengujian

### 3.1 REST Bounded

Skenario ini mensimulasikan beban harian aplikasi pada endpoint non-ML yang paling sering diakses:

- `GET /auth/me`
- `GET /users/:userId/dashboard`
- `GET /users/:userId/medications`
- `GET /users/:userId/medications/calendar`
- `GET /users/:userId/diaries/by-date`
- `GET /users/:userId/ml-readiness`

Pola beban:

- naik bertahap sampai 25 VU
- naik bertahap sampai 50 VU
- naik bertahap sampai 75 VU
- total durasi efektif: 2 menit 45 detik

### 3.2 ML Moderate

Skenario ini menguji beban moderat pada endpoint ML:

- `POST /users/:userId/ml-predictions`
- `POST /users/:userId/ml-recommendations`

Pola beban:

- naik bertahap sampai 3 VU
- naik bertahap sampai 5 VU
- naik bertahap sampai 8 VU
- total durasi efektif: 1 menit 55 detik

### 3.3 ML Bounded

Skenario ini menguji beban ML yang lebih tinggi namun tetap dalam batas yang masih masuk akal:

- `POST /users/:userId/ml-predictions`
- `POST /users/:userId/ml-recommendations`

Pola beban:

- naik bertahap sampai 5 VU
- naik bertahap sampai 10 VU
- naik bertahap sampai 15 VU
- total durasi efektif: 2 menit 10 detik

## 4. Ringkasan Hasil

### 4.1 Hasil REST Bounded

| Metrik | Hasil |
|---|---:|
| Max VUs | 75 |
| Total request | 30.363 |
| Request rate | 200,44 req/s |
| Failure rate | 0,00% |
| Avg latency | 73,83 ms |
| Median latency | 37,61 ms |
| P95 latency | 281,60 ms |
| Max latency | 980,53 ms |
| Total iterasi | 5.048 |

Latency per endpoint:

| Endpoint | Avg | P95 | Max |
|---|---:|---:|---:|
| `GET /auth/me` | 63,89 ms | 242,56 ms | 447,61 ms |
| `GET /users/:userId/dashboard` | 66,45 ms | 266,94 ms | 980,53 ms |
| `GET /users/:userId/medications` | 60,66 ms | 242,83 ms | 430,24 ms |
| `GET /users/:userId/medications/calendar` | 89,64 ms | 371,91 ms | 643,03 ms |
| `GET /users/:userId/diaries/by-date` | 68,17 ms | 276,44 ms | 917,96 ms |
| `GET /users/:userId/ml-readiness` | 92,40 ms | 283,93 ms | 481,33 ms |

Kesimpulan REST:

- seluruh request berhasil (`100% success`);
- backend tetap responsif hingga 75 concurrent VUs;
- endpoint operasional umum masih sangat layak untuk kebutuhan aplikasi harian.

### 4.2 Hasil ML Moderate

| Metrik | Hasil |
|---|---:|
| Max VUs | 8 |
| Total request | 102 |
| Request rate | 0,89 req/s |
| Failure rate | 0,00% |
| Avg latency | 4,66 s |
| Median latency | 4,16 s |
| P95 latency | 10,86 s |
| Max latency | 12,84 s |
| Total iterasi | 43 |

Latency per endpoint:

| Endpoint | Avg | P95 | Max |
|---|---:|---:|---:|
| `POST /users/:userId/ml-predictions` | 4,83 s | 10,28 s | 12,77 s |
| `POST /users/:userId/ml-recommendations` | 5,28 s | 10,90 s | 12,84 s |

Kesimpulan ML moderate:

- seluruh request berhasil (`100% success`);
- threshold P95 12 detik masih terpenuhi;
- ini dapat dianggap sebagai beban ML yang masih nyaman untuk backend saat ini.

### 4.3 Hasil ML Bounded

| Metrik | Hasil |
|---|---:|
| Max VUs | 15 |
| Total request | 145 |
| Request rate | 1,16 req/s |
| Failure rate | 0,00% |
| Avg latency | 7,21 s |
| Median latency | 5,99 s |
| P95 latency | 16,82 s |
| Max latency | 19,55 s |
| Total iterasi | 62 |

Latency per endpoint:

| Endpoint | Avg | P95 | Max |
|---|---:|---:|---:|
| `POST /users/:userId/ml-predictions` | 7,57 s | 17,14 s | 19,29 s |
| `POST /users/:userId/ml-recommendations` | 8,53 s | 16,91 s | 19,55 s |

Kesimpulan ML bounded:

- seluruh request masih berhasil (`100% success`);
- tidak ditemukan error fungsional pada backend;
- namun target latency P95 terlampaui, sehingga bottleneck utama mulai terlihat pada jalur ML ketika concurrency naik ke 15 VU.

## 5. Interpretasi Hasil

Berdasarkan tiga skenario di atas, dapat disimpulkan bahwa:

1. **Lapisan REST umum backend sangat stabil.**  
   Pada beban sampai 75 VUs, backend masih menghasilkan failure rate `0,00%` dengan P95 hanya `281,60 ms`. Ini menunjukkan modul autentikasi ringan, dashboard, medication, diary, dan readiness ML mampu melayani trafik tinggi dengan baik.

2. **Jalur ML tetap stabil secara fungsional, tetapi lebih sensitif terhadap concurrency.**  
   Pada skenario ML bounded, tidak ada request gagal, tetapi P95 naik hingga `16,82 s`. Ini berarti sistem masih mampu memproses request, namun waktu tunggu pengguna mulai menjadi cukup panjang.

3. **Beban ML moderat lebih layak direkomendasikan untuk operasi normal.**  
   Pada skenario hingga 8 VUs, endpoint ML masih memenuhi target P95 di bawah `12 detik`. Karena itu, beban ini lebih representatif sebagai batas operasional yang nyaman dibanding skenario 15 VUs.

4. **Masalah utama bukan kegagalan request, melainkan degradasi latensi.**  
   Dengan kata lain, backend PulseWise saat ini lebih dahulu mengalami perlambatan pada modul ML sebelum mengalami error atau kegagalan layanan.

## 6. Rekomendasi Teknis

Rekomendasi dari hasil pengujian ini adalah sebagai berikut:

1. endpoint REST umum sudah cukup siap untuk beban aplikasi mobile dan CMS;
2. endpoint ML sebaiknya dianggap sebagai jalur komputasi berat dan tidak dipukul dengan concurrency tinggi tanpa antrean atau strategi pembatasan tersendiri;
3. jika beban ML diperkirakan meningkat pada production, optimasi dapat difokuskan pada:
   - efisiensi payload dan orchestration ke HFMS,
   - caching readiness atau data pendukung non-inferensi,
   - queue/background execution untuk proses rekomendasi,
   - pemisahan worker ML dari traffic REST biasa.

## 7. Narasi Singkat Siap Pakai untuk Skripsi

Berikut narasi ringkas yang dapat langsung diadaptasi:

> Pengujian stress test backend PulseWise dilakukan menggunakan Grafana k6 pada lingkungan lokal terkendali dengan Redis aktif dan data uji sebanyak 200 akun cohort. Endpoint estimasi nutrisi berbasis foto makanan tidak disertakan dalam pengujian karena bergantung pada layanan multimodal eksternal. Hasil pengujian menunjukkan bahwa endpoint REST umum mampu menangani hingga 75 virtual users dengan failure rate 0,00% dan nilai P95 latency sebesar 281,60 ms. Pada sisi integrasi machine learning, skenario beban moderat hingga 8 virtual users masih memenuhi target P95 di bawah 12 detik dengan failure rate 0,00%. Namun, pada skenario beban ML yang lebih tinggi hingga 15 virtual users, seluruh request masih berhasil diproses tetapi P95 latency meningkat menjadi 16,82 detik. Temuan ini menunjukkan bahwa backend PulseWise telah stabil untuk trafik REST umum, sedangkan jalur machine learning masih layak secara fungsional namun memerlukan optimasi lebih lanjut pada aspek latensi ketika concurrency meningkat.

## 8. Artefak Hasil

File hasil yang dihasilkan selama pengujian:

- `out/loadtest/rest-summary.json`
- `out/loadtest/ml-summary.json`
- `out/loadtest/ml-moderate-summary.json`
- `out/loadtest/backend-stress.stdout.log`
- `out/loadtest/backend-stress.stderr.log`