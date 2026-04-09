# Frontend Integration Guide (PulseWise)

Dokumen ini merangkum endpoint yang perlu dipakai frontend (mobile + web) supaya implementasi konsisten.

## 1) Endpoint Utama Yang Aktif

### Auth
- POST /api/v1/auth/login
- GET /api/v1/auth/me

### Patient/Doctor Profile
- GET /api/v1/patients/{patientId}/profile
- PUT /api/v1/patients/{patientId}/profile
- GET /api/v1/doctors/{doctorId}/profile
- PUT /api/v1/doctors/{doctorId}/profile

### Relasi Dokter-Pasien (Primary)
- POST /api/v1/doctors/{doctorId}/patients/link-by-patient-id
  - Tujuan: menerima hasil scan QR dari frontend.
  - Body minimal:

```json
{
  "patientId": "<uuid-pasien>",
  "source": "qr_patient_id"
}
```

### Dashboard Dokter
- GET /api/v1/doctors/{doctorId}/dashboard/patients
- GET /api/v1/doctors/{doctorId}/dashboard/patients/{patientId}
- GET /api/v1/doctors/{doctorId}/dashboard/patients/{patientId}/vitals
- GET /api/v1/doctors/{doctorId}/dashboard/patients/{patientId}/abnormal-report

## 2) Endpoint Legacy (Opsional)

Endpoint ini masih tersedia untuk kompatibilitas lama, tetapi bukan flow utama frontend terbaru:
- POST /api/v1/patients/{patientId}/shares
- POST /api/v1/doctors/{doctorId}/patients/link-by-share

## 3) Mekanisme QR Untuk Desktop Web Pairing

Pertanyaan: untuk skenario web menampilkan QR lalu HP scan, apakah perlu session id?

Jawaban: ya, rekomendasi terbaik adalah pakai pairing session id jangka pendek.

### Pola yang direkomendasikan
1. Web dashboard membuat pairing session (misalnya TTL 60-120 detik).
2. Backend mengembalikan pairingSessionId + pairingToken (short-lived).
3. Web menampilkan QR berisi pairingToken (bukan data sensitif pasien).
4. App mobile scan QR lalu memanggil endpoint confirm pairing dengan auth mobile user.
5. Backend validasi token + session status, lalu membuat relasi dokter-pasien.
6. Web subscribe SSE untuk status pairing session, fallback polling bila koneksi SSE terputus.

### Endpoint backend yang sudah tersedia
- POST /api/v1/doctors/{doctorId}/dashboard/pairing-sessions
- POST /api/v1/dashboard/pairing-sessions/confirm
- GET /api/v1/doctors/{doctorId}/dashboard/pairing-sessions/{pairingSessionId}
- GET /api/v1/doctors/{doctorId}/dashboard/pairing-sessions/{pairingSessionId}/events (SSE)

### Kenapa pakai pairing session id
- Mencegah replay QR lama.
- Bisa di-expire otomatis.
- Mudah dipantau statusnya (pending/success/expired/cancelled).
- Aman untuk UX seperti WhatsApp Web (real-time confirmation).

## 4) Payload Contract Singkat Untuk Frontend

### Primary QR flow (yang sudah ada saat ini)
- QR berisi string patientId (di-generate frontend).
- Hasil scan dikirim ke:
  - POST /api/v1/doctors/{doctorId}/patients/link-by-patient-id

### Desktop pairing flow (yang direkomendasikan untuk ditambah nanti)
- QR idealnya berisi pairing token (bukan patientId mentah), karena konteksnya login/pairing sesi antar device.

## 5) Source of Truth

- Swagger/OpenAPI: docs/openapi.yaml
- Postman Main: postman/PulseWise-API.postman_collection.json
- Postman Smoke: postman/PulseWise-Dashboard-Smoke.postman_collection.json
- Postman Environment: postman/PulseWise-Local.postman_environment.json
