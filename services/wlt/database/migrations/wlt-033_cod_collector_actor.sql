-- WLT-033: Generalize delivery collection ownership across fulfillment modes.
-- Money remains WLT-owned; DSH supplies only immutable delivery references and
-- the actor that physically collected cash. captain_id remains a non-null
-- compatibility projection for older WLT readers; collector_type/collector_id
-- are the governed actor identity.

ALTER TABLE wlt_cod_records
    ADD COLUMN IF NOT EXISTS collector_type TEXT,
    ADD COLUMN IF NOT EXISTS collector_id TEXT;

UPDATE wlt_cod_records
SET collector_type = COALESCE(NULLIF(collector_type, ''), 'captain'),
    collector_id = COALESCE(NULLIF(collector_id, ''), captain_id),
    captain_id = COALESCE(captain_id, '')
WHERE collector_type IS NULL OR collector_id IS NULL
   OR collector_type = '' OR collector_id = ''
   OR captain_id IS NULL;

CREATE OR REPLACE FUNCTION wlt_normalize_delivery_collection_actor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.collector_type := NULLIF(BTRIM(NEW.collector_type), '');
    NEW.collector_id := NULLIF(BTRIM(NEW.collector_id), '');
    NEW.captain_id := COALESCE(BTRIM(NEW.captain_id), '');

    -- Old captain-only writers remain accepted and are normalized into the
    -- governed collector actor fields.
    IF NEW.collector_type IS NULL AND NEW.captain_id <> '' THEN
        NEW.collector_type := 'captain';
        NEW.collector_id := NEW.captain_id;
    END IF;

    IF NEW.collector_type IS NULL OR NEW.collector_id IS NULL THEN
        RAISE EXCEPTION 'collector_type and collector_id are required';
    END IF;

    IF NEW.collector_type = 'captain' THEN
        NEW.captain_id := NEW.collector_id;
    ELSE
        -- Preserve the non-null legacy shape without pretending that a store
        -- courier or partner store is a Bthwani captain.
        NEW.captain_id := '';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_normalize_delivery_collection_actor
    ON wlt_cod_records;
CREATE TRIGGER trg_wlt_normalize_delivery_collection_actor
BEFORE INSERT OR UPDATE OF captain_id, collector_type, collector_id
ON wlt_cod_records
FOR EACH ROW
EXECUTE FUNCTION wlt_normalize_delivery_collection_actor();

ALTER TABLE wlt_cod_records
    ALTER COLUMN captain_id SET DEFAULT '',
    ALTER COLUMN captain_id SET NOT NULL,
    ALTER COLUMN collector_type SET NOT NULL,
    ALTER COLUMN collector_id SET NOT NULL;

ALTER TABLE wlt_cod_records
    DROP CONSTRAINT IF EXISTS wlt_cod_records_collector_type_check;
ALTER TABLE wlt_cod_records
    ADD CONSTRAINT wlt_cod_records_collector_type_check
    CHECK (collector_type IN ('captain', 'store_courier', 'partner_store'));

CREATE INDEX IF NOT EXISTS idx_wlt_cod_records_collector
    ON wlt_cod_records(collector_type, collector_id, created_at DESC);
