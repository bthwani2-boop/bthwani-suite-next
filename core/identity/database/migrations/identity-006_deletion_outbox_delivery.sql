-- JRN-002 FS-08: durable deletion-outbox delivery, retry, and reconciliation fields.

ALTER TABLE identity_account_deletions_outbox
  ADD COLUMN IF NOT EXISTS event_key text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

UPDATE identity_account_deletions_outbox
SET event_key = 'identity.account.deleted:' || id::text
WHERE event_key IS NULL;

ALTER TABLE identity_account_deletions_outbox
  ALTER COLUMN event_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'identity_deletion_outbox_attempts_check'
  ) THEN
    ALTER TABLE identity_account_deletions_outbox
      ADD CONSTRAINT identity_deletion_outbox_attempts_check CHECK (attempts >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS identity_deletion_outbox_event_key_idx
  ON identity_account_deletions_outbox(event_key);

CREATE INDEX IF NOT EXISTS identity_deletion_outbox_delivery_idx
  ON identity_account_deletions_outbox(next_attempt_at, id)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS identity_deletion_outbox_reconciliation_idx
  ON identity_account_deletions_outbox(actor_id, created_at DESC);

COMMENT ON COLUMN identity_account_deletions_outbox.event_key IS
  'Stable idempotency key used by downstream anonymization consumers.';
COMMENT ON COLUMN identity_account_deletions_outbox.next_attempt_at IS
  'Retry schedule owned by the Identity outbox delivery worker.';
