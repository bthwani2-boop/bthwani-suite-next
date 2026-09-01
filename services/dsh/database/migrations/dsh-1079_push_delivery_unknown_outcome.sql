-- DSH-1079: close the provider-side-effect / local-finalization window for push.
-- A push delivery has one durable provider idempotency key for its lifetime.
-- An expired worker lease is UNKNOWN, never an automatic retry.

BEGIN;

ALTER TABLE dsh_notification_channel_deliveries
  ADD COLUMN IF NOT EXISTS provider_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unknown_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciliation_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reconciliation_at TIMESTAMPTZ;

-- The historical notification migration used several names for the same
-- local delivery lifecycle. Convert them once before installing the canonical
-- state vocabulary; no application reader needs to preserve those aliases.
UPDATE dsh_notification_channel_deliveries
SET status = CASE status
  WHEN 'queued' THEN 'pending'
  WHEN 'retrying' THEN 'pending'
  WHEN 'delivered' THEN 'sent'
  WHEN 'dead' THEN 'failed'
  ELSE status
END;

UPDATE dsh_notification_channel_deliveries
SET provider_idempotency_key = 'push:' || id::text
WHERE channel = 'push'
  AND NULLIF(BTRIM(provider_idempotency_key), '') IS NULL;

ALTER TABLE dsh_notification_channel_deliveries
  DROP CONSTRAINT IF EXISTS dsh_notification_channel_deliveries_status_check,
  DROP CONSTRAINT IF EXISTS dsh_notification_channel_deliveries_reconciliation_attempt_count_check,
  DROP CONSTRAINT IF EXISTS dsh_notification_channel_deliveries_push_identity_check,
  DROP CONSTRAINT IF EXISTS dsh_notification_channel_deliveries_sending_lease_check;

ALTER TABLE dsh_notification_channel_deliveries
  ADD CONSTRAINT dsh_notification_channel_deliveries_status_check CHECK (
    status IN ('pending', 'sending', 'unknown', 'sent', 'failed', 'suppressed')
  ),
  ADD CONSTRAINT dsh_notification_channel_deliveries_reconciliation_attempt_count_check
    CHECK (reconciliation_attempt_count >= 0),
  ADD CONSTRAINT dsh_notification_channel_deliveries_push_identity_check CHECK (
    channel <> 'push'
    OR NULLIF(BTRIM(provider_idempotency_key), '') IS NOT NULL
  ),
  ADD CONSTRAINT dsh_notification_channel_deliveries_sending_lease_check CHECK (
    status <> 'sending'
    OR (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_notification_push_provider_idempotency
  ON dsh_notification_channel_deliveries(provider_idempotency_key)
  WHERE channel = 'push';

CREATE INDEX IF NOT EXISTS idx_dsh_notification_push_delivery_due
  ON dsh_notification_channel_deliveries(status, next_retry_at, created_at)
  WHERE channel = 'push' AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_notification_push_delivery_unknown
  ON dsh_notification_channel_deliveries(next_retry_at, updated_at)
  WHERE channel = 'push' AND status = 'unknown';

CREATE INDEX IF NOT EXISTS idx_dsh_notification_push_delivery_lease
  ON dsh_notification_channel_deliveries(lease_expires_at, updated_at)
  WHERE channel = 'push' AND status = 'sending';

COMMIT;
