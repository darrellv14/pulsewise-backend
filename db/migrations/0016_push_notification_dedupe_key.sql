ALTER TABLE push_notification_logs
  ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_dedupe_key
  ON push_notification_logs(dedupe_key);
