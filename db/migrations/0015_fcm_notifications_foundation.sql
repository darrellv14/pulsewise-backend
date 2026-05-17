CREATE TABLE IF NOT EXISTS fcm_device_tokens (
  fcm_token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  platform VARCHAR(16) NOT NULL,
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  app_version VARCHAR(64),
  app_build VARCHAR(32),
  locale VARCHAR(16),
  timezone VARCHAR(64),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_code VARCHAR(128),
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_device_tokens_user_active
  ON fcm_device_tokens(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_fcm_device_tokens_device
  ON fcm_device_tokens(device_id);

CREATE INDEX IF NOT EXISTS idx_fcm_device_tokens_last_seen
  ON fcm_device_tokens(last_seen_at);

CREATE TABLE IF NOT EXISTS push_notification_logs (
  notification_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  fcm_token_id UUID REFERENCES fcm_device_tokens(fcm_token_id) ON DELETE SET NULL,
  requested_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  notification_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data_payload JSONB,
  delivery_status VARCHAR(32) NOT NULL DEFAULT 'queued',
  provider_message_id VARCHAR(255),
  provider_error_code VARCHAR(128),
  provider_response JSONB,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_user_created
  ON push_notification_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_type_created
  ON push_notification_logs(notification_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_status_created
  ON push_notification_logs(delivery_status, created_at DESC);
