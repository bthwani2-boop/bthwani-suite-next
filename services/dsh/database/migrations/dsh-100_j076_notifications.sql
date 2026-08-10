-- DSH-100: J076 Notifications, Templates, Preferences, and Delivery

ALTER TABLE dsh_platform_notification_config
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE dsh_notification_channel_deliveries
  DROP CONSTRAINT IF EXISTS dsh_notification_channel_deliveries_status_check;

ALTER TABLE dsh_notification_channel_deliveries
  ADD CONSTRAINT dsh_notification_channel_deliveries_status_check
  CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'retrying', 'dead', 'suppressed'));

-- If any old pending statuses exist that we want to map to queued for clarity, though pending might have been the old one:
-- In J076 'queued' is used, so let's update any 'pending' to 'queued'.
UPDATE dsh_notification_channel_deliveries SET status = 'queued' WHERE status = 'pending';
