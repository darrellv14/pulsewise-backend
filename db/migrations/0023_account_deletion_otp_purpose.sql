ALTER TABLE email_verifications
ADD COLUMN IF NOT EXISTS purpose VARCHAR(32);

UPDATE email_verifications
SET purpose = COALESCE(NULLIF(TRIM(purpose), ''), 'email_verification')
WHERE purpose IS NULL
   OR TRIM(purpose) = '';

ALTER TABLE email_verifications
ALTER COLUMN purpose SET DEFAULT 'email_verification';

ALTER TABLE email_verifications
ALTER COLUMN purpose SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_verifications_email_purpose_time
ON email_verifications (email, purpose, created_at DESC);
