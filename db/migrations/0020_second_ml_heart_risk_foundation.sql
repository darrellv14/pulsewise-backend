CREATE TABLE IF NOT EXISTS patient_heart_risk_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  age SMALLINT,
  sex SMALLINT,
  chest_pain_type SMALLINT,
  resting_bp_s INTEGER,
  cholesterol INTEGER,
  fasting_blood_sugar SMALLINT,
  resting_ecg SMALLINT,
  max_heart_rate INTEGER,
  exercise_angina SMALLINT,
  old_peak DECIMAL(5, 2),
  st_slope SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT patient_heart_risk_assessments_patient_id_assessment_date_key
    UNIQUE (patient_id, assessment_date)
);

CREATE INDEX IF NOT EXISTS idx_patient_heart_risk_assessments_patient_date
  ON patient_heart_risk_assessments (patient_id, assessment_date DESC);

ALTER TABLE patient_ml_inference_results
  ADD COLUMN IF NOT EXISTS model_key VARCHAR(64) NOT NULL DEFAULT 'hfms';

CREATE INDEX IF NOT EXISTS idx_patient_ml_inference_results_patient_model_type_generated
  ON patient_ml_inference_results (patient_id, model_key, inference_type, generated_at DESC);
