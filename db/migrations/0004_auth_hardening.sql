ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) NOT NULL DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

UPDATE users
SET account_status = 'active',
    email_verified_at = COALESCE(email_verified_at, NOW())
WHERE account_status IS DISTINCT FROM 'active';

CREATE TABLE IF NOT EXISTS email_verifications (
  verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  otp_code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email_time
  ON email_verifications (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user
  ON email_verifications (user_id, created_at DESC);
