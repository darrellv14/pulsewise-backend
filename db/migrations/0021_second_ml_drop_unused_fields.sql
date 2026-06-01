ALTER TABLE patient_heart_risk_assessments
  DROP COLUMN IF EXISTS cholesterol,
  DROP COLUMN IF EXISTS resting_ecg;
