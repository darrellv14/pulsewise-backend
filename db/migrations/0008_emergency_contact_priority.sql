ALTER TABLE emergency_contacts
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_emergency_contacts_single_priority_per_user
  ON emergency_contacts (user_id)
  WHERE is_priority = TRUE;
