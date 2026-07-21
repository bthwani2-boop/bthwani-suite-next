-- DSH-074: govern delivery-fee changes with OCC and append-only audit.

CREATE TABLE IF NOT EXISTS dsh_store_delivery_pricing_audit (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id               TEXT NOT NULL REFERENCES dsh_stores(id) ON DELETE RESTRICT,
    fulfillment_mode       TEXT NOT NULL,
    actor_id               TEXT NOT NULL,
    actor_surface          TEXT NOT NULL CHECK (actor_surface IN ('control-panel','app-partner','system')),
    action                 TEXT NOT NULL CHECK (action IN ('create','update','pause','activate','archive')),
    from_fee_minor_units   BIGINT,
    to_fee_minor_units     BIGINT,
    from_status            TEXT,
    to_status              TEXT,
    reason                 TEXT NOT NULL DEFAULT '',
    correlation_id         TEXT NOT NULL DEFAULT '',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_pricing_audit_store
    ON dsh_store_delivery_pricing_audit(store_id,fulfillment_mode,created_at DESC);

CREATE OR REPLACE FUNCTION dsh_protect_pickup_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.fulfillment_mode='pickup' AND NEW.fee_minor_units<>0 THEN
        RAISE EXCEPTION 'pickup fee must remain zero';
    END IF;
    IF NEW.status='active' AND NEW.approved_at IS NULL THEN
        RAISE EXCEPTION 'active delivery pricing requires approval';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_protect_pickup_fee ON dsh_store_delivery_pricing;
CREATE TRIGGER trg_dsh_protect_pickup_fee
BEFORE INSERT OR UPDATE ON dsh_store_delivery_pricing
FOR EACH ROW
EXECUTE FUNCTION dsh_protect_pickup_fee();
