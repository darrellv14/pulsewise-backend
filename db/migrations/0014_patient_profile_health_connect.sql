ALTER TABLE patient_profiles
  ADD COLUMN health_connect_preference VARCHAR(32),
  ADD COLUMN health_connect_status VARCHAR(32);

ALTER TABLE patient_profiles
  ADD CONSTRAINT patient_profiles_health_connect_preference_check
  CHECK (
    health_connect_preference IS NULL OR
    health_connect_preference IN ('connect_now', 'remind_later', 'no_device')
  );

ALTER TABLE patient_profiles
  ADD CONSTRAINT patient_profiles_health_connect_status_check
  CHECK (
    health_connect_status IS NULL OR
    health_connect_status IN ('not_started', 'connected')
  );
