-- DSH-958: unified partner workspace, brand/store ownership, and per-store readiness.
--
-- Partner is the tenant-scoped legal entity. Brand is an optional commercial
-- identity owned by a partner. Store is the operational branch. Store ownership
-- transfers are always audited and a store may never cross tenant boundaries.

CREATE TABLE IF NOT EXISTS dsh_partner_brands (
    id              TEXT        PRIMARY KEY DEFAULT 'pbr_' || replace(gen_random_uuid()::text, '-', ''),
    tenant_id       TEXT        NOT NULL,
    partner_id      TEXT        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    name_ar         TEXT        NOT NULL,
    name_en         TEXT        NOT NULL DEFAULT '',
    category        TEXT        NOT NULL DEFAULT 'default',
    status          TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'paused', 'archived')),
    version         INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_partner_brands_tenant_name_unique
        UNIQUE (tenant_id, partner_id, name_ar)
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_brands_tenant_partner
    ON dsh_partner_brands(tenant_id, partner_id);

ALTER TABLE dsh_stores
    ADD COLUMN IF NOT EXISTS brand_id TEXT REFERENCES dsh_partner_brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_stores_tenant_partner_brand
    ON dsh_stores(tenant_id, partner_id, brand_id);

CREATE TABLE IF NOT EXISTS dsh_partner_store_transfer_audit (
    id                      TEXT        PRIMARY KEY DEFAULT 'psta_' || replace(gen_random_uuid()::text, '-', ''),
    tenant_id               TEXT        NOT NULL,
    store_id                TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE RESTRICT,
    from_partner_id         TEXT        REFERENCES dsh_partners(id) ON DELETE RESTRICT,
    to_partner_id           TEXT        NOT NULL REFERENCES dsh_partners(id) ON DELETE RESTRICT,
    actor_id                TEXT        NOT NULL,
    actor_surface           TEXT        NOT NULL DEFAULT 'control-panel',
    reason                  TEXT        NOT NULL CHECK (char_length(btrim(reason)) >= 5),
    expected_store_version  INTEGER     NOT NULL CHECK (expected_store_version > 0),
    resulting_store_version INTEGER     NOT NULL CHECK (resulting_store_version > expected_store_version),
    correlation_id          TEXT        NOT NULL DEFAULT '',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_store_transfer_audit_store
    ON dsh_partner_store_transfer_audit(tenant_id, store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_store_transfer_audit_partners
    ON dsh_partner_store_transfer_audit(tenant_id, from_partner_id, to_partner_id, created_at DESC);

CREATE OR REPLACE FUNCTION dsh_enforce_partner_store_tenant_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    owner_tenant TEXT;
BEGIN
    IF NEW.partner_id IS NULL OR btrim(NEW.partner_id) = '' THEN
        RETURN NEW;
    END IF;

    SELECT tenant_id
      INTO owner_tenant
      FROM dsh_partners
     WHERE id = NEW.partner_id;

    IF owner_tenant IS NULL THEN
        RAISE EXCEPTION 'partner % does not exist', NEW.partner_id
            USING ERRCODE = '23503';
    END IF;

    IF owner_tenant <> NEW.tenant_id THEN
        RAISE EXCEPTION 'partner/store tenant mismatch for store %', NEW.id
            USING ERRCODE = '23514';
    END IF;

    IF NEW.brand_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM dsh_partner_brands b
         WHERE b.id = NEW.brand_id
           AND b.tenant_id = NEW.tenant_id
           AND b.partner_id = NEW.partner_id
    ) THEN
        RAISE EXCEPTION 'brand/store ownership mismatch for store %', NEW.id
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_enforce_partner_store_tenant_match ON dsh_stores;
CREATE TRIGGER trg_dsh_enforce_partner_store_tenant_match
BEFORE INSERT OR UPDATE OF tenant_id, partner_id, brand_id ON dsh_stores
FOR EACH ROW
EXECUTE FUNCTION dsh_enforce_partner_store_tenant_match();

CREATE OR REPLACE VIEW dsh_partner_store_readiness_v AS
SELECT
    s.tenant_id,
    s.partner_id,
    s.id AS store_id,
    s.display_name,
    s.status,
    s.is_visible,
    s.serviceability_status,
    s.partner_readiness,
    s.catalog_approval_status,
    s.marketing_visibility,
    (
        s.status = 'active'
        AND s.is_visible = true
        AND s.serviceability_status IN ('serviceable', 'limited')
        AND s.partner_readiness = 'ready'
        AND s.catalog_approval_status = 'approved'
        AND s.marketing_visibility = 'visible'
    ) AS store_gates_passed,
    ARRAY_REMOVE(ARRAY[
        CASE WHEN s.status <> 'active' THEN 'STORE_INACTIVE' END,
        CASE WHEN s.is_visible = false THEN 'STORE_HIDDEN' END,
        CASE WHEN s.serviceability_status NOT IN ('serviceable', 'limited') THEN 'STORE_NOT_SERVICEABLE' END,
        CASE WHEN s.partner_readiness <> 'ready' THEN 'PARTNER_READINESS_PENDING' END,
        CASE WHEN s.catalog_approval_status <> 'approved' THEN 'CATALOG_NOT_APPROVED' END,
        CASE WHEN s.marketing_visibility <> 'visible' THEN 'MARKETING_NOT_VISIBLE' END
    ], NULL) AS blocked_reason_codes
FROM dsh_stores s
WHERE s.partner_id IS NOT NULL;
