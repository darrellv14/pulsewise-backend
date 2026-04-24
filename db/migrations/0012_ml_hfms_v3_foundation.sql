CREATE TABLE IF NOT EXISTS patient_ml_profiles (
  patient_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  demog1_riagendr SMALLINT,
  demog1_ridreth3 SMALLINT,
  demog1_dmdeduc SMALLINT,
  demog1_dmdfmsiz SMALLINT,
  demog1_dmdhhsiz SMALLINT,
  demog1_dmdhhsza SMALLINT,
  demog1_dmdhhszb SMALLINT,
  demog1_dmdhhsze SMALLINT,
  demog1_dmdmartl SMALLINT,
  quest22_smq020 SMALLINT,
  quest22_smq890 SMALLINT,
  quest22_smq900 SMALLINT,
  quest23_smd470 SMALLINT,
  quest1_alq111 SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_ml_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  exami1_bpxpls SMALLINT,
  labor1_lbdtcsi NUMERIC(10,2),
  labor2_urdflow1 NUMERIC(10,2),
  labor2_urdtime1 NUMERIC(10,2),
  labor2_urxvol1 NUMERIC(10,2),
  quest11_hiq011 SMALLINT,
  quest12_heq010 SMALLINT,
  quest12_heq030 SMALLINT,
  quest15_kiq022 SMALLINT,
  quest15_kiq026 SMALLINT,
  quest16_mcq010 SMALLINT,
  quest16_mcq160b SMALLINT,
  quest16_mcq220 SMALLINT,
  quest16_mcq300a SMALLINT,
  quest16_mcq300c SMALLINT,
  quest17_dpq020 SMALLINT,
  quest17_dpq030 SMALLINT,
  quest17_dpq040 SMALLINT,
  quest20_pfq061b SMALLINT,
  quest20_pfq061c SMALLINT,
  quest20_pfq061h SMALLINT,
  quest3_cdq009 SMALLINT,
  quest3_cdq010 SMALLINT,
  quest7_diq010 SMALLINT,
  quest9_dlq050 SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT patient_ml_assessments_patient_id_assessment_date_key UNIQUE (patient_id, assessment_date)
);

CREATE INDEX IF NOT EXISTS idx_patient_ml_assessments_patient_date
  ON patient_ml_assessments (patient_id, assessment_date DESC);

CREATE TABLE IF NOT EXISTS daily_sleep_records (
  sleep_record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL UNIQUE REFERENCES heart_diaries(diary_id) ON DELETE CASCADE,
  sleep_time TIME,
  wake_time TIME,
  sleep_duration_hours NUMERIC(5,2),
  source VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE daily_activities
  ADD COLUMN IF NOT EXISTS activity_category VARCHAR(32),
  ADD COLUMN IF NOT EXISTS intensity_level VARCHAR(32),
  ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(32),
  ADD COLUMN IF NOT EXISTS outdoor_minutes INTEGER;

ALTER TABLE daily_symptoms
  ADD COLUMN IF NOT EXISTS symptom_code VARCHAR(80),
  ADD COLUMN IF NOT EXISTS body_area VARCHAR(80),
  ADD COLUMN IF NOT EXISTS is_chest_pain BOOLEAN,
  ADD COLUMN IF NOT EXISTS pain_frequency_code SMALLINT,
  ADD COLUMN IF NOT EXISTS pain_location_code SMALLINT;

ALTER TABLE daily_consumptions
  ADD COLUMN IF NOT EXISTS portion_grams NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fdc_food_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS nutrition_source VARCHAR(32),
  ADD COLUMN IF NOT EXISTS energy_kcal NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS protein_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS carbohydrate_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sugar_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_fat_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS saturated_fat_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monounsaturated_fat_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS polyunsaturated_fat_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cholesterol_mg NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS calcium_mg NUMERIC(10,2);
