# Pulse Wise ERD v1 (PostgreSQL)

Dokumen ini adalah turunan dari referensi model lama (Room/Firebase) + kebutuhan fitur baru backend.

## Design Notes

- Semua timestamp menggunakan `timestamptz`.
- Semua relasi user-centric menggunakan `users.user_id` (UUID).
- `heart_diaries` menyimpan agregasi harian, sedangkan `vital_sign_readings` menyimpan event time-series granular.
- `user_roles` mendukung RBAC fleksibel (pasien, dokter, admin).

## Core Tables

- `roles`
- `users`
- `user_roles`
- `doctor_profiles`
- `patient_profiles`
- `doctor_patients`

## Health Diary Tables

- `heart_diaries`
- `daily_metrics`
- `daily_activities`
- `daily_consumptions`

## Medication Tables

- `medications`
- `medication_schedules`
- `medication_logs`

## Device and Telemetry Tables

- `device_connections`
- `vital_sign_readings`

## Prediction and Alert Tables

- `risk_predictions`
- `alert_events`

## Sharing and Audit Tables

- `patient_shares`
- `emergency_contacts`
- `audit_logs`

## Relationship Summary

- Satu `user` bisa punya banyak `user_roles`.
- Satu `doctor` bisa punya banyak `patients` lewat `doctor_patients`.
- Satu `patient` bisa punya banyak diary (`heart_diaries`) dan telemetry (`vital_sign_readings`).
- Satu `heart_diary` bisa punya banyak `daily_metrics`, `daily_activities`, `daily_consumptions`.
- Satu `patient` bisa punya banyak `risk_predictions` dan `alert_events`.
- Satu `patient` bisa punya banyak `patient_shares` untuk akses dokter via QR/ID flow.

## Increment Plan

1. Lock `ERD v1` untuk fondasi modul auth, profile, diary, telemetry.
2. Tambahkan optimasi indeks setelah query pattern nyata muncul.
3. Iterasi v2 untuk kebutuhan khusus model ML/analytics lanjutan.
