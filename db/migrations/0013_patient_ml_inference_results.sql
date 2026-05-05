CREATE TABLE IF NOT EXISTS patient_ml_inference_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  inference_type VARCHAR(32) NOT NULL,
  request_context VARCHAR(32),
  ml_version VARCHAR(64) NOT NULL,
  payload_hash VARCHAR(128) NOT NULL,
  payload JSONB,
  source_summary JSONB,
  window_start_date DATE NOT NULL,
  window_end_date DATE NOT NULL,
  upstream_endpoint TEXT,
  upstream_status INTEGER,
  upstream_body JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_ml_inference_results_patient_type_generated
  ON patient_ml_inference_results (patient_id, inference_type, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_ml_inference_results_requested_by
  ON patient_ml_inference_results (requested_by_user_id, generated_at DESC);
