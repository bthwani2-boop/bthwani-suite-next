-- DSH-089: Persist the physical COD collection actor independently from the
-- fulfillment implementation. Existing captain events remain compatible.

ALTER TABLE dsh_wlt_outbox_events
    ADD COLUMN IF NOT EXISTS collector_type TEXT,
    ADD COLUMN IF NOT EXISTS collector_id TEXT;

UPDATE dsh_wlt_outbox_events
SET collector_type = COALESCE(NULLIF(collector_type, ''), 'captain'),
    collector_id = COALESCE(NULLIF(collector_id, ''), captain_id)
WHERE collector_type IS NULL OR collector_id IS NULL
   OR collector_type = '' OR collector_id = '';

ALTER TABLE dsh_wlt_outbox_events
    ALTER COLUMN captain_id DROP NOT NULL,
    ALTER COLUMN collector_type SET NOT NULL,
    ALTER COLUMN collector_id SET NOT NULL;

ALTER TABLE dsh_wlt_outbox_events
    DROP CONSTRAINT IF EXISTS dsh_wlt_outbox_events_collector_type_check;
ALTER TABLE dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_collector_type_check
    CHECK (collector_type IN ('captain', 'store_courier', 'partner_store'));

CREATE INDEX IF NOT EXISTS idx_dsh_wlt_outbox_events_collector
    ON dsh_wlt_outbox_events(collector_type, collector_id, created_at DESC);
