# FE/PM Alignment 2026-04-11

Dokumen ini merangkum tindak lanjut atas request FE terkait:

1. emergency contact priority
2. biodata patient saat onboarding
3. perluasan kontrak medication

## Yang Sudah Dieksekusi

### 1. Emergency Contact Priority

Quick win ini sudah diimplementasikan.

Perubahan:

- response `GET /api/v1/users/{userId}/emergency-contacts` sekarang membawa `isPriority`
- payload `POST /api/v1/users/{userId}/emergency-contacts` sekarang menerima `isPriority`
- payload `PUT /api/v1/users/{userId}/emergency-contacts/{emergencyContactId}` sekarang menerima `isPriority`
- hanya satu emergency contact per user yang boleh memiliki `isPriority = true`
- kontak prioritas akan muncul lebih dulu di hasil `GET`

Contoh response item:

```json
{
  "emergencyContactId": "c6809495-f078-4698-8941-04d477896417",
  "userId": "3a233724-0b42-4a4f-88e8-88e732c46351",
  "contactLabel": "Ibu",
  "contactNumber": "081234567890",
  "isPriority": true,
  "createdAt": "2026-04-10T19:08:29.551Z"
}
```

Aturan error:

```json
{
  "success": false,
  "message": "Hanya satu emergency contact yang boleh menjadi prioritas"
}
```

Catatan implementasi:

- rule ini dicek di layer aplikasi
- rule ini juga dikunci di database dengan unique partial index untuk menghindari race condition

## Yang Sudah Tersedia dan Disarankan Dipakai FE

### 2. Patient Profile Onboarding

Backend sudah punya endpoint profile onboarding patient:

- `GET /api/v1/patients/{patientId}/profile`
- `PUT /api/v1/patients/{patientId}/profile`

Payload yang sudah didukung:

```json
{
  "dateOfBirth": "2001-09-11",
  "sex": "male",
  "heightCm": 172.5,
  "isSmoking": false,
  "isElectricSmoking": false,
  "bloodType": "O+",
  "address": "WTC NYC"
}
```

Kenapa tidak digabung penuh ke `POST /api/v1/auth/register`:

- endpoint register sebaiknya tetap fokus ke akun/auth
- field biodata patient masuk domain profile, bukan auth
- profile onboarding lebih aman jika dijalankan setelah register/login berhasil
- validasi dan lifecycle patient profile lebih mudah dirawat terpisah

Flow yang disarankan:

1. `POST /api/v1/auth/register`
2. email verification / login
3. `PUT /api/v1/patients/{patientId}/profile`

Catatan implementasi FE:

- boleh tetap 1 layar onboarding
- saat submit, FE cukup pecah jadi 2 request berurutan
- payload dan response profile tetap memakai field English yang canonical (`dateOfBirth`, `sex`, `heightCm`, `bloodType`, `address`)

## Yang Sudah Dieksekusi Lanjutan

### 3. Medication V2

Medication sudah dipindahkan ke kontrak V2 untuk `POST/GET/PUT /api/v1/users/{userId}/medications`.

Kontrak V2 yang dipakai:

```json
{
  "name": "Aspirin",
  "form": "tablet",
  "color": "white",
  "singleDose": 1,
  "singleDoseUnit": "tablet",
  "startDate": "2026-04-11",
  "frequency": "daily",
  "numOfDays": 7,
  "intakeTimes": ["08:00", "20:00"],
  "note": "Setelah makan"
}
```

Contoh weekly:

```json
{
  "name": "Obat A",
  "form": "capsule",
  "singleDose": 2,
  "singleDoseUnit": "capsule",
  "startDate": "2026-04-11",
  "frequency": "weekly",
  "daysOfWeek": [1, 3, 5],
  "intakeTimes": ["08:00"],
  "note": null
}
```

Catatan desain:

- `daysOfWeek` lebih disarankan sebagai array integer daripada object `senin: true`
- mapping `daysOfWeek` yang dipakai: `1=Monday`, `2=Tuesday`, `3=Wednesday`, `4=Thursday`, `5=Friday`, `6=Saturday`, `7=Sunday`
- `intakeTimes` lebih bersih jika dipisah dari medication utama sebagai schedule entries
- `singleDoseUnit` lebih aman jika dibatasi ke enum ringan
- endpoint reminder tetap tersedia sebagai low-level schedule API, dan sekarang juga mendukung `dayOfWeek`

## Prioritas Implementasi

1. Emergency contact priority: quick win, sudah dikerjakan
2. Patient profile onboarding: sudah tersedia, FE cukup pakai endpoint profile existing
3. Medication V2: sudah diimplementasikan dengan kontrak daily/weekly
