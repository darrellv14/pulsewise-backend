# Nutrition Estimation with Self-Hosted Qwen

Dokumen ini merancang pendekatan estimasi nutrisi PulseWise dengan keputusan sementara:

- **tanpa nutrition estimation service terpisah**
- **backend PulseWise langsung memanggil Qwen self-hosted**
- fokus tahap awal pada **pure Qwen**
- output harus **JSON-only** dan divalidasi backend
- deployment awal boleh memakai VPS sekarang, lalu dimigrasikan kemudian

## 1. Keputusan Arsitektur Saat Ini

### Yang dipakai

- PulseWise backend memanggil model Qwen self-hosted secara langsung
- model berjalan di host yang sama untuk tahap awal, atau dipindah ke VPS terpisah saat migrasi
- backend tetap menjadi gateway tunggal untuk FE

### Yang belum dipakai

- belum ada microservice nutrition estimator terpisah
- belum ada knowledge base nutrisi khusus
- belum ada hybrid grounding ke database referensi makanan

Keputusan ini cocok untuk fase eksplorasi cepat, selama kita menerima bahwa:

- hasil estimasi adalah **AI estimation**, bukan data nutrisi klinis presisi
- backend tetap harus memvalidasi output sebelum menyimpan ke database

## 2. Use Case yang Ingin Didukung

User **wajib memberi kombinasi input**, bukan hanya satu sinyal tunggal.

Minimal kombinasi yang disarankan:

- `nama makanan + deskripsi tambahan`
- `nama makanan + foto makanan`
- `nama makanan + deskripsi tambahan + foto makanan`

Pendekatan ini dipilih supaya estimasi Qwen tidak terlalu spekulatif.

Input yang dipakai:

- **nama makanan**
  - contoh: `Nasi padang`
- **deskripsi tambahan**
  - contoh: `1 plate nasi padang with a mound of rice, 1 egg portion, 1 perkedel, 1 serving beef rendang, small fried tempeh piece, small vegetable sides`
- **foto makanan**

Input yang **tidak disarankan** untuk tahap awal:

- hanya `nama makanan` saja
- hanya `foto makanan` saja
- hanya `deskripsi tambahan` saja

Target model:

- mendeteksi makanan Indonesia dari foto
- memahami deskripsi porsi campuran
- tetap mampu menangani makanan non-Indonesia
- mengembalikan JSON yang cocok untuk struktur backend PulseWise

## 3. Rekomendasi Model dan Hosting

### Target awal

- model: Qwen small / 4B-class
- runtime: Ollama atau runtime serupa
- deployment awal: VPS sekarang
- deployment target: VPS migrasi dengan resource lebih besar / host terpisah

### Catatan kapasitas

- model 4B-class lebih realistis untuk RAM 8 GB dibanding 8B-class
- untuk CPU-only, latency akan terasa lebih lambat daripada API model komersial
- untuk tahap awal ini, request harus dibatasi dan jangan dibuat paralel terlalu agresif

### Implikasi praktis

- satu request estimasi nutrisi akan lebih cocok diperlakukan sebagai workflow asinkron ringan atau blocking request dengan timeout ketat
- gambar harus dikecilkan / dikompres sebelum diproses
- context prompt jangan dibuat panjang-panjang

## 4. Arsitektur End-to-End

### Flow tanpa service terpisah

1. FE kirim kombinasi `mealName` + (`mealDescription` atau `image`)
2. backend membentuk prompt dan payload multimodal untuk Qwen
3. backend memanggil Qwen self-hosted
4. Qwen mengembalikan JSON-only
5. backend memvalidasi JSON
6. backend:
   - mengembalikan hasil estimasi ke FE, atau
   - menyimpan snapshot nutrisi ke `daily_consumptions`

### Komponen

#### A. PulseWise Backend

Tanggung jawab:

- autentikasi dan rate limit
- menerima input nama makanan / deskripsi / foto
- menyusun prompt Qwen
- memanggil runtime model
- validasi JSON output
- menyimpan snapshot nutrisi
- caching hasil estimasi

#### B. Qwen Self-Hosted Runtime

Tanggung jawab:

- menerima prompt dari backend
- melakukan reasoning untuk makanan dan porsi
- mengembalikan output JSON-only

## 5. Input Contract yang Disarankan

### Estimate only

`POST /users/:userId/nutrition-estimates`

Request:

```json
{
  "mealName": "Nasi padang",
  "mealDescription": "1 plate nasi padang with a mound of rice, 1 egg portion, 1 perkedel, 1 serving beef rendang, small fried tempeh piece, small vegetable sides",
  "locale": "id-ID"
}
```

Untuk versi foto, tetap disarankan ada `mealName`:

- bisa pakai multipart upload
- atau image URL internal sementara

Contoh conceptual payload:

```json
{
  "mealName": "Nasi padang",
  "mealDescription": "1 plate nasi padang with a mound of rice, 1 egg portion, 1 perkedel, 1 serving beef rendang",
  "locale": "id-ID",
  "imageUrl": "https://..."
}
```

### Estimate and save

`POST /users/:userId/diaries/by-date/consumptions/estimate`

Request:

```json
{
  "diaryDate": "2026-05-18",
  "type": "food",
  "name": "Nasi padang",
  "mealDescription": "1 plate nasi padang with a mound of rice, 1 egg portion, 1 perkedel, 1 serving beef rendang",
  "locale": "id-ID"
}
```

## 6. Prompt Guidelines untuk Qwen

### Peran model

Model diarahkan untuk:

- bertindak sebagai nutrition estimation assistant
- sangat paham makanan Indonesia dari Sabang sampai Merauke
- tetap mampu memahami makanan non-Indonesia
- konservatif saat informasi kurang lengkap
- mengembalikan JSON saja

### Fokus prompt

Prompt harus meminta model:

- mendeteksi makanan dari nama, deskripsi, dan foto
- memecah komponen hidangan yang realistis
- mengestimasi porsi total
- mengestimasi berat dalam gram
- mengestimasi nutrisi utama
- tidak menjawab dengan markdown atau narasi bebas

### Larangan prompt

Model tidak boleh:

- menjawab di luar JSON
- menambahkan disclaimer panjang
- menambahkan teks penjelasan sebelum/sesudah JSON

## 7. Output Schema yang Disarankan

Output model harus berbentuk:

```json
{
  "detectedFoods": ["string"],
  "portion": "string",
  "portionGrams": 0,
  "nutritionSnapshot": {
    "energyKcal": 0,
    "proteinG": 0,
    "carbohydrateG": 0,
    "sugarG": 0,
    "fiberG": 0,
    "totalFatG": 0,
    "saturatedFatG": 0,
    "monounsaturatedFatG": 0,
    "polyunsaturatedFatG": 0,
    "cholesterolMg": 0,
    "calciumMg": 0
  },
  "confidence": 0,
  "assumptions": ["string"]
}
```

### Catatan field

- `portion` boleh berupa deskripsi natural yang lebih panjang
- `portionGrams` adalah estimasi total berat
- `nutritionSnapshot` disiapkan agar langsung kompatibel dengan `daily_consumptions`
- `confidence` membantu FE/backend menandai estimasi yang terlalu spekulatif

## 8. Validasi Backend

Walaupun pendekatannya pure Qwen, backend tetap harus menjadi penjaga kualitas.

### Minimal validasi

- `mealName` wajib ada
- request harus punya minimal salah satu dari `mealDescription` atau `image`
- output harus valid JSON
- semua angka nutrisi harus angka dan `>= 0`
- `portion` tidak boleh kosong jika estimasi berhasil
- numeric value yang absurd harus ditolak atau diclamp
- `detectedFoods` harus array string

### Error handling

- kalau model gagal JSON-only:
  - retry sekali dengan prompt repair
- kalau tetap gagal:
  - return error aman ke FE

## 9. Batasan Tahap Awal

Karena ini pure Qwen:

- estimasi bisa berbeda antar request yang mirip
- makanan daerah yang jarang mungkin masih miss
- foto dengan plating rumit bisa salah deteksi
- angka nutrisi harus dianggap estimasi kasar, bukan ground truth medis

## 10. Roadmap yang Disepakati

### Tahap 1

- Qwen self-hosted
- prompt JSON only
- output divalidasi backend

### Tahap 2

- tambah cache
- tambah rate limit
- tambah retry JSON repair

Untuk saat ini, kita **berhenti di tahap 2 dulu**. Knowledge base, hybrid grounding, dan service terpisah bisa dipertimbangkan setelah proof-of-concept terbukti berguna.

## 11. Catatan Implementasi Backend

Supaya kompatibel dengan output AI yang verbose:

- field `portion` backend sudah diarahkan untuk menerima nilai yang lebih panjang
- validator request sebaiknya tidak memakai limit pendek seperti 80 karakter

## 12. Kapan Perlu Dipisah ke Service Terpisah

Walaupun sekarang sengaja tidak dipisah, nanti perlu dievaluasi ulang bila:

- latency request backend utama mulai terganggu
- traffic estimasi nutrisi naik
- model diganti ke varian yang lebih berat
- inference butuh host khusus dengan resource sendiri
