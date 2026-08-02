-- DSH-966: Retire the never-populated partner-brand feature (X3).
--
-- dsh_partner_brands (dsh-958) has zero Go writers/readers anywhere in the
-- repository -- no handler ever creates a brand. The only live touch of
-- dsh_stores.brand_id is store_ownership_closure.go, which always set it to
-- NULL during a partner transfer (removed in this same change); it was
-- never set to a real value. Since the brand feature was never wired up,
-- the column and its backing table are dead, not merely unused-but-populated.
--
-- Note: dsh_categories / dsh_stores.category_id (dsh-002) were already
-- retired by dsh-036_central_catalog_runtime_closure.sql and are not
-- touched here.
--
-- dsh_stores.brand_id is validated by the
-- trg_dsh_enforce_partner_store_OperatorContext_match trigger (dsh-958); the
-- function is replaced here to drop the brand_id check clause since the
-- column no longer exists.

DO $$
DECLARE
  brand_id_count integer;
BEGIN
  SELECT count(*) INTO brand_id_count FROM dsh_stores WHERE brand_id IS NOT NULL;
  IF brand_id_count > 0 THEN
    RAISE EXCEPTION 'dsh-966: refusing to drop dsh_stores.brand_id; % row(s) still have a non-null value, contradicting the "always NULL" analysis', brand_id_count;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION dsh_enforce_partner_store_OperatorContext_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    owner_OperatorContext TEXT;
BEGIN
    IF NEW.partner_id IS NULL OR btrim(NEW.partner_id) = '' THEN
        RETURN NEW;
    END IF;

    SELECT operator_context_id
      INTO owner_OperatorContext
      FROM dsh_partners
     WHERE id = NEW.partner_id;

    IF owner_OperatorContext IS NULL THEN
        RAISE EXCEPTION 'partner % does not exist', NEW.partner_id
            USING ERRCODE = '23503';
    END IF;

    IF owner_OperatorContext <> NEW.operator_context_id THEN
        RAISE EXCEPTION 'partner/store OperatorContext mismatch for store %', NEW.id
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_enforce_partner_store_OperatorContext_match ON dsh_stores;
CREATE TRIGGER trg_dsh_enforce_partner_store_OperatorContext_match
BEFORE INSERT OR UPDATE OF operator_context_id, partner_id ON dsh_stores
FOR EACH ROW
EXECUTE FUNCTION dsh_enforce_partner_store_OperatorContext_match();

DROP INDEX IF EXISTS idx_dsh_stores_OperatorContext_partner_brand;

ALTER TABLE dsh_stores DROP COLUMN IF EXISTS brand_id;

DROP TABLE IF EXISTS dsh_partner_brands;
