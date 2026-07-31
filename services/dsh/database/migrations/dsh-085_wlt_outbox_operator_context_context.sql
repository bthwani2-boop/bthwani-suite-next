-- dsh-085_wlt_outbox_OperatorContext_context.sql
-- Carries the checkout OperatorContext into every durable DSH -> WLT event.
-- This is a forward-only repair: applied migration history remains immutable.

BEGIN;

ALTER TABLE dsh_wlt_outbox_events
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

UPDATE dsh_wlt_outbox_events AS event
SET operator_context_id = intent.operator_context_id
FROM dsh_checkout_intents AS intent
WHERE intent.id = event.checkout_intent_id
  AND (event.operator_context_id IS NULL OR btrim(event.operator_context_id) = '');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM dsh_wlt_outbox_events
    WHERE operator_context_id IS NULL OR btrim(operator_context_id) = ''
  ) THEN
    RAISE EXCEPTION 'cannot enforce WLT outbox OperatorContext context: unscoped rows remain';
  END IF;
END $$;

ALTER TABLE dsh_wlt_outbox_events
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS chk_dsh_wlt_outbox_events_operator_context_id,
  ADD CONSTRAINT chk_dsh_wlt_outbox_events_operator_context_id
    CHECK (char_length(btrim(operator_context_id)) BETWEEN 1 AND 120);

CREATE INDEX IF NOT EXISTS idx_dsh_wlt_outbox_events_OperatorContext_pending
  ON dsh_wlt_outbox_events(operator_context_id, next_retry_at, created_at)
  WHERE status IN ('pending', 'processing');

COMMIT;
