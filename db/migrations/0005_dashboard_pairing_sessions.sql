CREATE TABLE IF NOT EXISTS dashboard_pairing_sessions (
  pairing_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pairing_token_hash TEXT NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  confirmed_by_patient_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_dashboard_pairing_sessions_doctor_status
  ON dashboard_pairing_sessions (doctor_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_pairing_sessions_expires_at
  ON dashboard_pairing_sessions (expires_at);
