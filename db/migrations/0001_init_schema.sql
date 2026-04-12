CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
  role_id SMALLSERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  label VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_photo TEXT,
  address TEXT,
  tel_no VARCHAR(40),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_id SMALLINT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
  doctor_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  specialization VARCHAR(120),
  license_no VARCHAR(120),
  hospital_name VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_profiles (
  patient_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  date_of_birth DATE,
  sex VARCHAR(16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_patients (
  doctor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (doctor_id, patient_id)
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  emergency_contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  contact_label VARCHAR(100) NOT NULL,
  contact_number VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS heart_diaries (
  diary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  diary_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, diary_date)
);

CREATE TABLE IF NOT EXISTS daily_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES heart_diaries(diary_id) ON DELETE CASCADE,
  condition_tag VARCHAR(64),
  body_height NUMERIC(5,2),
  body_weight NUMERIC(5,2),
  bmi NUMERIC(5,2),
  systolic_pressure INTEGER,
  diastolic_pressure INTEGER,
  heart_rate INTEGER,
  time_stamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_activities (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES heart_diaries(diary_id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  duration INTEGER,
  heart_rate INTEGER,
  user_feeling VARCHAR(80),
  note TEXT,
  time_stamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_consumptions (
  consumption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES heart_diaries(diary_id) ON DELETE CASCADE,
  type VARCHAR(50),
  name VARCHAR(120),
  portion VARCHAR(80),
  note TEXT,
  time_stamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medications (
  medication_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  condition_tag VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_schedules (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(medication_id) ON DELETE CASCADE,
  schedule_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_logs (
  medication_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(medication_id) ON DELETE CASCADE,
  medication_time TIME,
  medication_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_connections (
  device_connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  source VARCHAR(64) NOT NULL,
  device_id VARCHAR(120),
  device_name VARCHAR(120),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vital_sign_readings (
  reading_id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  source VARCHAR(64) NOT NULL,
  metric_type VARCHAR(64) NOT NULL,
  value_numeric NUMERIC(10,3),
  unit VARCHAR(32),
  payload JSONB,
  measured_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_predictions (
  prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  model_name VARCHAR(120) NOT NULL,
  model_version VARCHAR(64),
  risk_score NUMERIC(6,5) NOT NULL,
  risk_level VARCHAR(32) NOT NULL,
  features_snapshot JSONB,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_events (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES risk_predictions(prediction_id) ON DELETE SET NULL,
  alert_type VARCHAR(64) NOT NULL,
  severity VARCHAR(32) NOT NULL,
  message TEXT NOT NULL,
  is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS patient_shares (
  share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  share_code VARCHAR(100) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heart_diaries_user_date ON heart_diaries (user_id, diary_date DESC);
CREATE INDEX IF NOT EXISTS idx_vital_readings_user_time ON vital_sign_readings (user_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_vital_readings_metric_time ON vital_sign_readings (metric_type, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_user_time ON risk_predictions (user_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_events_user_time ON alert_events (user_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_date ON medication_logs (user_id, medication_date DESC);
