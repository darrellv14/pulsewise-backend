# Frontend Activity Contract Sheet

Dokumen ini adalah kontrak resmi frontend untuk endpoint:

- `POST /api/v1/users/{userId}/diaries/{diaryId}/activities`
- `POST /api/v1/users/{userId}/diaries/by-date/activities`

Tujuan dokumen ini:

- memberi daftar value yang **pasti diterima backend**
- mencegah frontend mengirim kategori aktivitas yang liar
- menjelaskan field mana yang selalu tampil, dan field mana yang hanya relevan untuk jenis aktivitas tertentu
- menjelaskan kontribusi field activity ke payload ML

## Prinsip Utama

- `name` tetap field utama yang dibaca user.
- `activityCategory`, `intensityLevel`, dan `transportMode` memakai **enum resmi backend**.
- `outdoorMinutes` adalah angka integer resmi.
- `transportMode` hanya relevan jika `activityCategory = transport`.
- Field activity ini **langsung dipakai ML**, bukan sekadar penyimpanan diary biasa.

## Contract Table

| Field | Allowed values | UI component | Example payload | Kapan wajib muncul / conditional logic |
|---|---|---|---|---|
| `name` | Teks bebas, `1..120` karakter | Text input atau dropdown aktivitas + fallback text | `"Bike commute"` | Selalu wajib |
| `activityCategory` | `work`, `transport`, `recreation`, `other` | Dropdown / segmented control | `"transport"` | Tidak wajib secara teknis, tapi sangat disarankan selalu diisi karena dipakai langsung oleh ML |
| `intensityLevel` | `light`, `moderate`, `vigorous`, `unknown` | Dropdown / radio / segmented control | `"moderate"` | Tidak wajib secara teknis, tapi sangat disarankan selalu diisi. Khusus `work` dan `recreation`, field ini penting untuk ML |
| `transportMode` | `walk`, `bicycle`, `other` | Dropdown / segmented control | `"bicycle"` | Hanya relevan jika `activityCategory = transport` |
| `outdoorMinutes` | Integer `0..1440` atau `null` | Number input, stepper, slider, atau picker durasi | `20` | Opsional, tapi sangat disarankan karena dipakai ke ML |
| `duration` | Integer `1..1440` atau `null` | Number input / duration picker | `20` | Opsional secara teknis, tapi sangat disarankan selalu diisi karena dipakai ke ML |
| `heartRate` | Integer `20..250` atau `null` | Number input atau auto dari device | `104` | Opsional |
| `userFeeling` | Teks bebas, max `80` karakter | Dropdown feeling atau text input | `"energized"` | Opsional |
| `note` | Teks bebas, max `2000` karakter | Textarea | `"Perjalanan ke kantor"` | Opsional |
| `timeStamp` | ISO datetime | Biasanya tidak diisi manual kalau sudah ada `diaryDate` context | `"2026-04-27T07:15:00.000Z"` | Opsional |
| `diaryDate` | Format `YYYY-MM-DD` | Date picker atau auto dari halaman diary hari itu | `"2026-04-27"` | Wajib untuk endpoint by-date |

## Enum Details

### `activityCategory`

Gunakan salah satu dari daftar ini:

```text
work
transport
recreation
other
```

Rekomendasi label UI:

- `work` -> Aktivitas kerja
- `transport` -> Aktivitas transportasi
- `recreation` -> Aktivitas olahraga / rekreasi
- `other` -> Aktivitas lain

Makna ke ML:

- `work` dipakai untuk menghitung aktivitas kerja berat
- `transport` dipakai untuk menghitung jalan/sepeda untuk mobilitas
- `recreation` dipakai untuk menghitung olahraga / aktivitas rekreasi berat

### `intensityLevel`

Gunakan salah satu dari daftar ini:

```text
light
moderate
vigorous
unknown
```

Rekomendasi label UI:

- `light` -> Ringan
- `moderate` -> Sedang
- `vigorous` -> Berat / intens
- `unknown` -> Tidak tahu / tidak yakin

Makna ke ML:

- Untuk `work`, backend hanya menghitung jika `intensityLevel = vigorous`
- Untuk `recreation`, backend hanya menghitung jika `intensityLevel = vigorous`

### `transportMode`

Gunakan salah satu dari daftar ini:

```text
walk
bicycle
other
```

Rekomendasi label UI:

- `walk` -> Jalan kaki
- `bicycle` -> Sepeda
- `other` -> Lainnya

Makna ke ML:

- Untuk `transport`, backend hanya menghitung ke variabel transport ML jika `transportMode = walk` atau `bicycle`

## Conditional UI Logic

### Flow normal

Tampilkan field berikut ke semua user:

- `name`
- `activityCategory`
- `duration`
- `heartRate`
- `outdoorMinutes`
- `note`

### Jika `activityCategory = work`

Frontend sebaiknya:

- tampilkan `intensityLevel`
- sangat sarankan user mengisi `duration`

Karena yang dipakai ML:

- `work + vigorous` -> `Quest19_PAD615`
- jumlah harinya -> `Quest19_PAQ610`

### Jika `activityCategory = transport`

Frontend sebaiknya:

- tampilkan `transportMode`
- tampilkan `duration`
- tampilkan `outdoorMinutes`

Karena yang dipakai ML:

- `transport + walk/bicycle` -> `Quest19_PAD645`
- ada atau tidaknya transport walk/bicycle -> `Quest19_PAQ635`
- jumlah hari transport walk/bicycle -> `Quest19_PAQ640`

Jika `transportMode = other`, data tetap tersimpan, tetapi **tidak dihitung** ke variabel transport ML yang membutuhkan `walk` atau `bicycle`.

### Jika `activityCategory = recreation`

Frontend sebaiknya:

- tampilkan `intensityLevel`
- tampilkan `duration`

Karena yang dipakai ML:

- `recreation + vigorous` -> `Quest19_PAD660`
- jumlah harinya -> `Quest19_PAQ655`

### Jika `activityCategory = other`

Frontend tetap boleh menyimpan aktivitas, tetapi kontribusinya ke variabel activity ML bisa terbatas tergantung field lain yang diisi.

## Example Payloads

### Work activity

```json
{
  "diaryDate": "2026-04-27",
  "name": "Mengangkat barang di gudang",
  "activityCategory": "work",
  "intensityLevel": "vigorous",
  "duration": 45,
  "heartRate": 118,
  "outdoorMinutes": 30,
  "note": "Shift pagi"
}
```

### Transport activity

```json
{
  "diaryDate": "2026-04-27",
  "name": "Bike commute",
  "activityCategory": "transport",
  "transportMode": "bicycle",
  "intensityLevel": "moderate",
  "duration": 20,
  "heartRate": 104,
  "outdoorMinutes": 20,
  "note": "Perjalanan ke kantor"
}
```

### Recreation activity

```json
{
  "diaryDate": "2026-04-27",
  "name": "Jogging sore",
  "activityCategory": "recreation",
  "intensityLevel": "vigorous",
  "duration": 30,
  "heartRate": 128,
  "outdoorMinutes": 25,
  "note": "Lari di taman"
}
```

## Activity Fields To ML Mapping

| Frontend input | Syarat | ML field |
|---|---|---|
| `activityCategory = work` + `intensityLevel = vigorous` + `duration` | dihitung total menit | `Quest19_PAD615` |
| `activityCategory = work` + `intensityLevel = vigorous` | dihitung jumlah hari unik | `Quest19_PAQ610` |
| `activityCategory = transport` + `transportMode in [walk, bicycle]` + `duration` | dihitung total menit | `Quest19_PAD645` |
| `activityCategory = transport` + `transportMode in [walk, bicycle]` | ada atau tidak | `Quest19_PAQ635` |
| `activityCategory = transport` + `transportMode in [walk, bicycle]` | dihitung jumlah hari unik | `Quest19_PAQ640` |
| `activityCategory = recreation` + `intensityLevel = vigorous` + `duration` | dihitung total menit | `Quest19_PAD660` |
| `activityCategory = recreation` + `intensityLevel = vigorous` | dihitung jumlah hari unik | `Quest19_PAQ655` |
| `outdoorMinutes` | jika diisi | `Quest6_DED1225` |

## Implementation Notes For FE

- Jangan kirim string bebas untuk `activityCategory`.
- Jangan kirim string bebas untuk `intensityLevel`.
- Jangan kirim string bebas untuk `transportMode`.
- `transportMode` sebaiknya hanya ditampilkan jika `activityCategory = transport`.
- `duration` dan `outdoorMinutes` sangat penting untuk kualitas data ML.
- Jika FE ingin pasien lebih cepat `ML-ready`, prioritaskan kelengkapan:
  - `activityCategory`
  - `duration`
  - `intensityLevel` untuk `work/recreation`
  - `transportMode` untuk `transport`
  - `outdoorMinutes`
