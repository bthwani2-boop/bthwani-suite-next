-- DSH-982: an ambiguous DSH-to-WLT delivery is UNKNOWN until canonical WLT
-- readback proves sent or absent. It must never become a blind retry directly.

BEGIN;

ALTER TABLE dsh_wlt_outbox_events
  DROP CONSTRAINT IF EXISTS dsh_wlt_outbox_events_status_check;
ALTER TABLE dsh_wlt_outbox_events
  ADD CONSTRAINT dsh_wlt_outbox_events_status_check
  CHECK (status IN ('pending','processing','unknown','sent','cancelled','failed'));

ALTER TABLE dsh_wlt_outbox_events
  ADD COLUMN IF NOT EXISTS last_readback_at timestamptz,
  ADD COLUMN IF NOT EXISTS readback_attempt_count integer NOT NULL DEFAULT 0;

ALTER TABLE dsh_wlt_outbox_events
  DROP CONSTRAINT IF EXISTS dsh_wlt_outbox_events_readback_attempt_count_chk;
ALTER TABLE dsh_wlt_outbox_events
  ADD CONSTRAINT dsh_wlt_outbox_events_readback_attempt_count_chk
  CHECK (readback_attempt_count >= 0);

CREATE INDEX IF NOT EXISTS idx_dsh_wlt_outbox_events_unknown_readback
  ON dsh_wlt_outbox_events(next_retry_at, updated_at)
  WHERE status = 'unknown';

COMMIT;
