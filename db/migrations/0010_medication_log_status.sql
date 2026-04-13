ALTER TABLE medication_logs
  ADD COLUMN IF NOT EXISTS status VARCHAR(16);

UPDATE medication_logs
SET status = 'taken'
WHERE status IS NULL;

ALTER TABLE medication_logs
  ALTER COLUMN status SET DEFAULT 'taken';

ALTER TABLE medication_logs
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE medication_logs
  DROP CONSTRAINT IF EXISTS medication_logs_status_check;

ALTER TABLE medication_logs
  ADD CONSTRAINT medication_logs_status_check
  CHECK (status IN ('taken', 'skipped', 'missed'));
