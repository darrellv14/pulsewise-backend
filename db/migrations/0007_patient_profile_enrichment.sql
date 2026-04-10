ALTER TABLE patient_profiles
  ADD COLUMN IF NOT EXISTS body_height_cm NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS is_smoking BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_electric_smoking BOOLEAN,
  ADD COLUMN IF NOT EXISTS blood_type VARCHAR(3);

ALTER TABLE patient_profiles
  DROP CONSTRAINT IF EXISTS patient_profiles_blood_type_check;

ALTER TABLE patient_profiles
  ADD CONSTRAINT patient_profiles_blood_type_check
  CHECK (blood_type IS NULL OR blood_type IN ('A', 'A+', 'A-', 'B', 'B+', 'B-', 'AB', 'AB+', 'AB-', 'O', 'O+', 'O-'));
