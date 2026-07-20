-- WLT-025: Generalize COD collection ownership across fulfillment modes.
-- Money remains WLT-owned; DSH supplies only immutable delivery references and
-- the actor that physically collected cash.

ALTER TABLE wlt_cod_records
    ADD COLUMN IF NOT EXISTS collector_type TEXT,
    ADD COLUMN IF NOT EXISTS collector_id TEXT;

UPDATE wlt_cod_records
SET collector_type = COALESCE(NULLIF(collector_type, ''), 'captain'),
    collector_id = COALESCE(NULLIF(collector_id, ''), captain_id)
WHERE collector_type IS NULL OR collector_id IS NULL
   OR collector_type = '' OR collector_id = '';

ALTER TABLE wlt_cod_records
    ALTER COLUMN captain_id DROP NOT NULL,
    ALTER COLUMN collector_type SET NOT NULL,
    ALTER COLUMN collector_id SET NOT NULL;

ALTER TABLE wlt_cod_records
    DROP CONSTRAINT IF EXISTS wlt_cod_records_collector_type_check;
ALTER TABLE wlt_cod_records
    ADD CONSTRAINT wlt_cod_records_collector_type_check
    CHECK (collector_type IN ('captain', 'store_courier', 'partner_store'));

CREATE INDEX IF NOT EXISTS idx_wlt_cod_records_collector
    ON wlt_cod_records(collector_type, collector_id, created_at DESC);
