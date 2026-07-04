-- WLT-008: DSH handoff control metadata.
-- These columns make DSH->WLT reference creation idempotent and auditable.

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS cart_snapshot_hash text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS idempotency_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS correlation_id text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS wlt_payment_sessions_idempotency_key_idx
  ON wlt_payment_sessions (idempotency_key)
  WHERE idempotency_key <> '';
