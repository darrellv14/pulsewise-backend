ALTER TABLE patient_heart_risk_assessments
ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

UPDATE patient_heart_risk_assessments
SET created_by_user_id = COALESCE(created_by_user_id, patient_id),
    updated_by_user_id = COALESCE(updated_by_user_id, patient_id)
WHERE created_by_user_id IS NULL
   OR updated_by_user_id IS NULL;

ALTER TABLE patient_heart_risk_assessments
ADD CONSTRAINT patient_heart_risk_assessments_created_by_user_id_fkey
FOREIGN KEY (created_by_user_id)
REFERENCES users(user_id)
ON DELETE SET NULL;

ALTER TABLE patient_heart_risk_assessments
ADD CONSTRAINT patient_heart_risk_assessments_updated_by_user_id_fkey
FOREIGN KEY (updated_by_user_id)
REFERENCES users(user_id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patient_heart_risk_assessments_created_by
ON patient_heart_risk_assessments (created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_patient_heart_risk_assessments_updated_by
ON patient_heart_risk_assessments (updated_by_user_id);
