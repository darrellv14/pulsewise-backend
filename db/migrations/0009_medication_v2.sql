ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS form VARCHAR(50),
  ADD COLUMN IF NOT EXISTS color VARCHAR(50),
  ADD COLUMN IF NOT EXISTS single_dose NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS single_dose_unit VARCHAR(32),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS frequency VARCHAR(16),
  ADD COLUMN IF NOT EXISTS num_of_days SMALLINT,
  ADD COLUMN IF NOT EXISTS note TEXT;

UPDATE medications
SET
  frequency = COALESCE(frequency, 'daily'),
  start_date = COALESCE(start_date, created_at::date);

ALTER TABLE medications
  ALTER COLUMN frequency SET DEFAULT 'daily';

ALTER TABLE medications
  ALTER COLUMN frequency SET NOT NULL;

ALTER TABLE medications
  DROP CONSTRAINT IF EXISTS medications_frequency_check;

ALTER TABLE medications
  ADD CONSTRAINT medications_frequency_check
  CHECK (frequency IN ('daily', 'weekly'));

ALTER TABLE medications
  DROP CONSTRAINT IF EXISTS medications_num_of_days_check;

ALTER TABLE medications
  ADD CONSTRAINT medications_num_of_days_check
  CHECK (num_of_days IS NULL OR (num_of_days BETWEEN 1 AND 10));

ALTER TABLE medication_schedules
  ADD COLUMN IF NOT EXISTS day_of_week SMALLINT;

ALTER TABLE medication_schedules
  DROP CONSTRAINT IF EXISTS medication_schedules_day_of_week_check;

ALTER TABLE medication_schedules
  ADD CONSTRAINT medication_schedules_day_of_week_check
  CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 1 AND 7));

CREATE UNIQUE INDEX IF NOT EXISTS uq_medication_schedules_user_med_day_time
  ON medication_schedules (user_id, medication_id, COALESCE(day_of_week, 0), schedule_time);
