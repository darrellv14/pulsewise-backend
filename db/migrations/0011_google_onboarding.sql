ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_unique
ON users (google_sub)
WHERE google_sub IS NOT NULL;
