ALTER TABLE doctor_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_note TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

UPDATE doctor_profiles
SET
  is_verified = TRUE,
  verified_at = COALESCE(verified_at, NOW()),
  rejection_reason = NULL
WHERE doctor_id IN (
  SELECT u.user_id
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.user_id
  JOIN roles r ON r.role_id = ur.role_id
  WHERE r.code = 'doctor'
    AND u.account_status = 'active'
);
