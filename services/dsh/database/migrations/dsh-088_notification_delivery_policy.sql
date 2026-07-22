-- DSH-088: Notification delivery policy, actor channels, quiet hours and localized templates.

ALTER TABLE dsh_notification_preferences
  ADD COLUMN IF NOT EXISTS channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME,
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Aden';

ALTER TABLE dsh_notification_preferences
  DROP CONSTRAINT IF EXISTS dsh_notification_preferences_channels_check;
ALTER TABLE dsh_notification_preferences
  ADD CONSTRAINT dsh_notification_preferences_channels_check
  CHECK (
    cardinality(channels) > 0
    AND channels <@ ARRAY['in_app', 'push']::TEXT[]
  );

ALTER TABLE dsh_notification_preferences
  DROP CONSTRAINT IF EXISTS dsh_notification_preferences_locale_check;
ALTER TABLE dsh_notification_preferences
  ADD CONSTRAINT dsh_notification_preferences_locale_check
  CHECK (locale IN ('ar', 'en'));

ALTER TABLE dsh_notification_preferences
  DROP CONSTRAINT IF EXISTS dsh_notification_preferences_quiet_hours_check;
ALTER TABLE dsh_notification_preferences
  ADD CONSTRAINT dsh_notification_preferences_quiet_hours_check
  CHECK (
    (quiet_hours_start IS NULL AND quiet_hours_end IS NULL)
    OR (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
  );

ALTER TABLE dsh_platform_notification_config
  ADD COLUMN IF NOT EXISTS default_channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  ADD COLUMN IF NOT EXISTS title_ar TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_ar TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS variables TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deep_link_pattern TEXT NOT NULL DEFAULT '';

ALTER TABLE dsh_platform_notification_config
  DROP CONSTRAINT IF EXISTS dsh_platform_notification_config_channels_check;
ALTER TABLE dsh_platform_notification_config
  ADD CONSTRAINT dsh_platform_notification_config_channels_check
  CHECK (
    cardinality(default_channels) > 0
    AND default_channels <@ ARRAY['in_app', 'push']::TEXT[]
  );

CREATE TABLE IF NOT EXISTS dsh_notification_channel_deliveries (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id     UUID        NOT NULL REFERENCES dsh_notifications(id) ON DELETE CASCADE,
  channel             TEXT        NOT NULL CHECK (channel IN ('in_app', 'push')),
  status              TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count       INTEGER     NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_retry_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_message_id TEXT,
  last_error          TEXT,
  sent_at             TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_dsh_notification_channel_deliveries_due
  ON dsh_notification_channel_deliveries (status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_notification_channel_deliveries_notification
  ON dsh_notification_channel_deliveries (notification_id);
