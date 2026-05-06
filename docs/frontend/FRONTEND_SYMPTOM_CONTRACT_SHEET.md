# Frontend Symptom Contract Sheet

Dokumen ini adalah kontrak resmi frontend untuk endpoint:

- `POST /users/{userId}/diaries/{diaryId}/symptoms`
- `POST /users/{userId}/diaries/by-date/symptoms`

Tujuan dokumen ini:

- memberi daftar value yang **pasti diterima backend**
- mencegah frontend mengirim string atau angka liar
- menjelaskan field mana yang selalu tampil, dan field mana yang hanya muncul saat chest pain

## Prinsip Utama

- `symptomName` tetap field utama yang dibaca user.
- `symptomCode` dan `bodyArea` sekarang memakai **enum resmi**.
- `isChestPain` adalah boolean resmi.
- `painFrequencyCode` dan `painLocationCode` sekarang memakai **enum angka resmi**.
- Jika gejala adalah chest pain, maka:
  - `symptomCode` wajib `chest_pain`
  - `bodyArea` wajib `chest`
  - `isChestPain` wajib `true`
  - `painFrequencyCode` wajib diisi
  - `painLocationCode` wajib diisi

## Contract Table

| Field | Allowed values | UI component | Example payload | Kapan wajib muncul / conditional logic |
|---|---|---|---|---|
| `symptomName` | Teks bebas, `1..120` karakter | Text input atau dropdown gejala + fallback text | `"Nyeri dada"` | Selalu wajib |
| `symptomCode` | `chest_pain`, `shortness_of_breath`, `palpitations`, `dizziness`, `headache`, `fatigue`, `cough`, `swelling`, `nausea`, `other` | Dropdown/select enum internal | `"chest_pain"` | Tidak wajib secara teknis untuk semua gejala, tapi sangat disarankan selalu diisi. Jika chest pain, wajib `chest_pain` |
| `bodyArea` | `head`, `chest`, `neck`, `left_arm`, `right_arm`, `upper_abdomen`, `back`, `leg`, `general`, `other` | Dropdown area tubuh atau body-map sederhana | `"chest"` | Tidak wajib untuk semua gejala, tapi sangat disarankan selalu diisi. Jika chest pain, wajib `chest` |
| `isChestPain` | `true`, `false`, `null` | Hidden computed field atau toggle internal | `true` | Jika `symptomCode = chest_pain`, wajib `true` |
| `painFrequencyCode` | `0`, `1`, `2` | Radio button / segmented control | `2` | Hanya wajib muncul jika gejala chest pain |
| `painLocationCode` | `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8` | Body-map detail atau radio list lokasi | `6` | Hanya wajib muncul jika gejala chest pain |
| `intensity` | Integer `1..10` atau `null` | Slider 1-10 atau radio ringan-sedang-berat | `5` | Opsional |
| `note` | Teks bebas, max `2000` karakter | Textarea | `"Terasa menjalar ke sisi kiri"` | Opsional |
| `time` | Format `HH:mm` | Time picker | `"14:30"` | Disarankan untuk endpoint by-date |
| `timeStamp` | ISO datetime | Biasanya tidak diisi manual jika sudah ada `time` | `"2026-04-27T14:30:00.000Z"` | Opsional; biasanya backend cukup dari `diaryDate + time` |
| `diaryDate` | Format `YYYY-MM-DD` | Date picker atau auto dari halaman diary hari itu | `"2026-04-27"` | Wajib untuk endpoint by-date |

## Enum Details

### `symptomCode`

Gunakan salah satu dari daftar ini:

```text
chest_pain
shortness_of_breath
palpitations
dizziness
headache
fatigue
cough
swelling
nausea
other
```

Rekomendasi label UI:

- `chest_pain` -> Nyeri dada
- `shortness_of_breath` -> Sesak napas
- `palpitations` -> Jantung berdebar
- `dizziness` -> Pusing berputar
- `headache` -> Sakit kepala
- `fatigue` -> Mudah lelah
- `cough` -> Batuk
- `swelling` -> Bengkak
- `nausea` -> Mual
- `other` -> Lainnya

### `bodyArea`

Gunakan salah satu dari daftar ini:

```text
head
chest
neck
left_arm
right_arm
upper_abdomen
back
leg
general
other
```

Rekomendasi label UI:

- `head` -> Kepala
- `chest` -> Dada
- `neck` -> Leher
- `left_arm` -> Lengan kiri
- `right_arm` -> Lengan kanan
- `upper_abdomen` -> Ulu hati / perut atas
- `back` -> Punggung
- `leg` -> Kaki
- `general` -> Seluruh badan / tidak spesifik
- `other` -> Lainnya

### `painFrequencyCode`

Gunakan code resmi berikut:

| Code | Label UI | Makna |
|---|---|---|
| `0` | Tidak tahu / tidak yakin | User tidak bisa memastikan durasi nyeri |
| `1` | Kurang dari 30 menit | Nyeri dada muncul singkat |
| `2` | 30 menit atau lebih | Nyeri dada berlangsung lama |

### `painLocationCode`

Gunakan code resmi berikut:

| Code | Label UI | Makna |
|---|---|---|
| `0` | Tidak tahu / tidak yakin | Lokasi tidak jelas |
| `1` | Lengan kanan | Nyeri dominan di lengan kanan |
| `2` | Dada kanan | Nyeri dominan di dada kanan |
| `3` | Leher | Nyeri dominan di leher |
| `4` | Dada atas / tulang dada atas | Nyeri dominan di sternum atas |
| `5` | Dada bawah / tulang dada bawah | Nyeri dominan di sternum bawah |
| `6` | Dada kiri | Nyeri dominan di dada kiri |
| `7` | Lengan kiri | Nyeri dominan di lengan kiri |
| `8` | Ulu hati / perut atas | Nyeri dominan di perut atas |

## Conditional UI Logic

### Flow normal

Tampilkan field berikut ke semua user:

- `symptomName`
- `symptomCode`
- `bodyArea`
- `intensity`
- `note`
- `time`

### Flow chest pain

Jika user memilih:

- `symptomCode = chest_pain`

maka frontend wajib:

- set `bodyArea = chest`
- set `isChestPain = true`
- munculkan field lanjutan:
  - `painFrequencyCode`
  - `painLocationCode`

Jika user memilih gejala selain chest pain:

- set `isChestPain = false`
- kirim `painFrequencyCode = null`
- kirim `painLocationCode = null`

## Example Payloads

### Non-chest pain

```json
{
  "diaryDate": "2026-04-27",
  "time": "08:00",
  "symptomName": "Pusing ringan",
  "symptomCode": "headache",
  "bodyArea": "head",
  "isChestPain": false,
  "painFrequencyCode": null,
  "painLocationCode": null,
  "intensity": 2,
  "note": "Muncul setelah bangun tidur"
}
```

### Chest pain

```json
{
  "diaryDate": "2026-04-27",
  "time": "14:30",
  "symptomName": "Nyeri dada",
  "symptomCode": "chest_pain",
  "bodyArea": "chest",
  "isChestPain": true,
  "painFrequencyCode": 2,
  "painLocationCode": 6,
  "intensity": 5,
  "note": "Terasa menjalar ke sisi kiri"
}
```

## Implementation Notes For FE

- Jangan kirim string bebas untuk `symptomCode`.
- Jangan kirim string bebas untuk `bodyArea`.
- Jangan tampilkan angka mentah `painFrequencyCode` dan `painLocationCode` ke user.
- Gunakan label manusiawi di UI, lalu map ke code resmi saat submit.
- Walaupun endpoint `symptoms` membantu ML, field NHANES formal untuk `Quest3_CDQ009` dan `Quest3_CDQ010` tetap diisi di endpoint `ml-assessments`.
