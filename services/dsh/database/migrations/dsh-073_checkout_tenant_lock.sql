-- DSH-073: tenant-lock checkout intents, WLT payment events, and orders.
--
-- Legacy rows remain nullable when no trustworthy tenant source exists. New
-- checkout intents and orders must always carry a non-empty authenticated
-- tenant. No synthetic/default tenant is introduced.

ALTER TABLE dsh_checkout_intents
    ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE dsh_checkout_intents intent
SET tenant_id = source.tenant_id
FROM (
    SELECT checkout_intent_id, MIN(funding_tenant_id) AS tenant_id
    FROM dsh_coupon_redemptions
    WHERE btrim(COALESCE(funding_tenant_id,'')) <> ''
    GROUP BY checkout_intent_id
    HAVING COUNT(DISTINCT funding_tenant_id) = 1
) source
WHERE source.checkout_intent_id = intent.id
  AND intent.tenant_id IS NULL;

ALTER TABLE dsh_checkout_intents
    DROP CONSTRAINT IF EXISTS dsh_checkout_intents_tenant_id_chk;
ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_tenant_id_chk
    CHECK (tenant_id IS NULL OR btrim(tenant_id) <> '');

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_checkout_tenant_payment_session
    ON dsh_checkout_intents(tenant_id,wlt_payment_session_id)
    WHERE tenant_id IS NOT NULL AND btrim(wlt_payment_session_id) <> '';
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_tenant_client
    ON dsh_checkout_intents(tenant_id,client_id,created_at DESC)
    WHERE tenant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION dsh_guard_checkout_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.tenant_id IS NULL OR btrim(NEW.tenant_id) = '' THEN
            RAISE EXCEPTION 'tenant_id is required for every new checkout intent'
                USING ERRCODE = '23514';
        END IF;
    ELSE
        IF OLD.tenant_id IS NOT NULL AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
            RAISE EXCEPTION 'checkout tenant_id is immutable'
                USING ERRCODE = '23514';
        END IF;
        IF NEW.tenant_id IS NULL OR btrim(NEW.tenant_id) = '' THEN
            RAISE EXCEPTION 'checkout tenant_id cannot be cleared'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_checkout_tenant ON dsh_checkout_intents;
CREATE TRIGGER trg_dsh_guard_checkout_tenant
BEFORE INSERT OR UPDATE OF tenant_id ON dsh_checkout_intents
FOR EACH ROW EXECUTE FUNCTION dsh_guard_checkout_tenant();

ALTER TABLE dsh_orders
    ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE dsh_orders orders
SET tenant_id = intent.tenant_id
FROM dsh_checkout_intents intent
WHERE intent.id = orders.checkout_intent_id
  AND intent.tenant_id IS NOT NULL
  AND orders.tenant_id IS NULL;

ALTER TABLE dsh_orders
    DROP CONSTRAINT IF EXISTS dsh_orders_tenant_id_chk;
ALTER TABLE dsh_orders
    ADD CONSTRAINT dsh_orders_tenant_id_chk
    CHECK (tenant_id IS NULL OR btrim(tenant_id) <> '');

CREATE INDEX IF NOT EXISTS idx_dsh_orders_tenant_client
    ON dsh_orders(tenant_id,client_id,created_at DESC)
    WHERE tenant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION dsh_assign_and_guard_order_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    checkout_tenant TEXT;
BEGIN
    SELECT tenant_id INTO checkout_tenant
    FROM dsh_checkout_intents
    WHERE id = NEW.checkout_intent_id
    FOR SHARE;

    IF checkout_tenant IS NULL OR btrim(checkout_tenant) = '' THEN
        RAISE EXCEPTION 'order requires a tenant-locked checkout intent'
            USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.tenant_id IS NOT NULL AND NEW.tenant_id <> checkout_tenant THEN
            RAISE EXCEPTION 'order tenant does not match checkout tenant'
                USING ERRCODE = '23514';
        END IF;
        NEW.tenant_id := checkout_tenant;
    ELSIF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'order tenant_id is immutable'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_assign_order_tenant ON dsh_orders;
CREATE TRIGGER trg_dsh_assign_order_tenant
BEFORE INSERT OR UPDATE OF tenant_id,checkout_intent_id ON dsh_orders
FOR EACH ROW EXECUTE FUNCTION dsh_assign_and_guard_order_tenant();
