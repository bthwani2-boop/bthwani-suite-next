-- DSH-1061: bind client substitution decisions to one durable command.
-- Existing preparation issue events remain the canonical transition ledger;
-- the new columns make replay identity and request collision checks explicit.

BEGIN;

ALTER TABLE dsh_order_preparation_issue_events
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

UPDATE dsh_order_preparation_issue_events
SET idempotency_key = correlation_id
WHERE btrim(idempotency_key) = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_preparation_issue_events_idempotency
    ON dsh_order_preparation_issue_events (issue_id, idempotency_key)
    WHERE btrim(idempotency_key) <> '';

CREATE INDEX IF NOT EXISTS idx_dsh_preparation_issue_events_decision_identity
    ON dsh_order_preparation_issue_events (issue_id, idempotency_key, created_at DESC)
    WHERE event_type = 'customer_decision';

COMMIT;
