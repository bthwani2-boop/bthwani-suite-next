-- DSH-971: forward structural recovery for environments that applied the
-- superseded destructive form of dsh-966.
--
-- This migration restores the schema and ownership enforcement only. It never
-- fabricates deleted commercial data; an affected environment must restore
-- historical brand rows and store links from its governed backup evidence.

CREATE TABLE IF NOT EXISTS dsh_partner_brands (
    id                    TEXT        PRIMARY KEY DEFAULT 'pbr_' || replace(gen_random_uuid()::text, '-', ''),
    operator_context_id   TEXT        NOT NULL,
    partner_id            TEXT        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    name_ar               TEXT        NOT NULL,
    name_en               TEXT        NOT NULL DEFAULT '',
    category              TEXT        NOT NULL DEFAULT 'default',
    status                TEXT        NOT NULL DEFAULT 'active'
                                      CHECK (status IN ('active', 'paused', 'archived')),
    version               INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_partner_brands_OperatorContext_name_unique
        UNIQUE (operator_context_id, partner_id, name_ar)
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_brands_OperatorContext_partner
    ON dsh_partner_brands(operator_context_id, partner_id);

ALTER TABLE dsh_stores
    ADD COLUMN IF NOT EXISTS brand_id TEXT REFERENCES dsh_partner_brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_stores_OperatorContext_partner_brand
    ON dsh_stores(operator_context_id, partner_id, brand_id);

CREATE OR REPLACE FUNCTION dsh_enforce_partner_store_OperatorContext_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    owner_OperatorContext TEXT;
BEGIN
    IF NEW.partner_id IS NULL OR btrim(NEW.partner_id) = '' THEN
        IF NEW.brand_id IS NOT NULL THEN
            RAISE EXCEPTION 'brand requires partner ownership for store %', NEW.id
                USING ERRCODE = '23514';
        END IF;
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

    IF NEW.brand_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM dsh_partner_brands b
         WHERE b.id = NEW.brand_id
           AND b.operator_context_id = NEW.operator_context_id
           AND b.partner_id = NEW.partner_id
    ) THEN
        RAISE EXCEPTION 'brand/store ownership mismatch for store %', NEW.id
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_enforce_partner_store_OperatorContext_match ON dsh_stores;
CREATE TRIGGER trg_dsh_enforce_partner_store_OperatorContext_match
BEFORE INSERT OR UPDATE OF operator_context_id, partner_id, brand_id ON dsh_stores
FOR EACH ROW
EXECUTE FUNCTION dsh_enforce_partner_store_OperatorContext_match();

COMMENT ON TABLE dsh_partner_brands IS
  'Governed optional commercial identity owned by a partner within one trusted operator context.';
