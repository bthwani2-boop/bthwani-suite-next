-- dsh-085_wlt_outbox_tenant_context.sql
-- Carries the checkout tenant into every durable DSH -> WLT event.
-- This is a forward-only repair: applied migration history remains immutable.

BEGIN;

ALTER TABLE dsh_wlt_outbox_events
  ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE dsh_wlt_outbox_events AS event
SET tenant_id = intent.tenant_id
FROM dsh_checkout_intents AS intent
WHERE intent.id = event.checkout_intent_id
  AND (event.tenant_id IS NULL OR btrim(event.tenant_id) = '');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM dsh_wlt_outbox_events
    WHERE tenant_id IS NULL OR btrim(tenant_id) = ''
  ) THEN
    RAISE EXCEPTION 'cannot enforce WLT outbox tenant context: unscoped rows remain';
  END IF;
END $$;

ALTER TABLE dsh_wlt_outbox_events
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS chk_dsh_wlt_outbox_events_tenant_id,
  ADD CONSTRAINT chk_dsh_wlt_outbox_events_tenant_id
    CHECK (char_length(btrim(tenant_id)) BETWEEN 1 AND 120);

CREATE INDEX IF NOT EXISTS idx_dsh_wlt_outbox_events_tenant_pending
  ON dsh_wlt_outbox_events(tenant_id, next_retry_at, created_at)
  WHERE status IN ('pending', 'processing');

COMMIT;
