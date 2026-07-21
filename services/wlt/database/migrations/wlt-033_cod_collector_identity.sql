-- WLT-025: COD custody belongs to the actual cash collector, not always a captain.
BEGIN;

ALTER TABLE wlt_cod_records
  ADD COLUMN IF NOT EXISTS collector_type text,
  ADD COLUMN IF NOT EXISTS collector_id text;

UPDATE wlt_cod_records
SET collector_type = COALESCE(NULLIF(collector_type, ''), 'captain'),
    collector_id = COALESCE(NULLIF(collector_id, ''), captain_id)
WHERE collector_type IS NULL OR collector_id IS NULL OR collector_type = '' OR collector_id = '';

ALTER TABLE wlt_cod_records
  ALTER COLUMN captain_id DROP NOT NULL,
  ALTER COLUMN collector_type SET NOT NULL,
  ALTER COLUMN collector_id SET NOT NULL;

ALTER TABLE wlt_cod_records
  DROP CONSTRAINT IF EXISTS wlt_cod_records_collector_type_chk;
ALTER TABLE wlt_cod_records
  ADD CONSTRAINT wlt_cod_records_collector_type_chk
  CHECK (collector_type IN ('captain','store_courier','partner_store'));

ALTER TABLE wlt_cod_records
  DROP CONSTRAINT IF EXISTS wlt_cod_records_captain_projection_chk;
ALTER TABLE wlt_cod_records
  ADD CONSTRAINT wlt_cod_records_captain_projection_chk
  CHECK (
    (collector_type = 'captain' AND captain_id = collector_id)
    OR (collector_type <> 'captain' AND captain_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS wlt_cod_records_collector_idx
  ON wlt_cod_records(collector_type, collector_id, created_at DESC);

COMMIT;
