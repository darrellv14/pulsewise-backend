CREATE TABLE IF NOT EXISTS daily_symptoms (
  symptom_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES heart_diaries(diary_id) ON DELETE CASCADE,
  symptom_name VARCHAR(120) NOT NULL,
  intensity SMALLINT,
  note TEXT,
  time_stamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_symptoms_diary
  ON daily_symptoms (diary_id, time_stamp DESC);
