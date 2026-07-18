-- DSH-065: governed store delivery pricing
--
-- Removes the client-side 950 YER fixture from financial calculation. Every
-- checkout resolves a persisted store + fulfillment-mode policy before WLT
-- handoff. The legacy UI value is migrated once as an explicit approved policy
-- (950 YER = 95,000 minor units); operators/partners may later change it through
-- governed APIs with versioning and audit.

CREATE TABLE IF NOT EXISTS dsh_store_delivery_pricing (
    store_id                    TEXT NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    fulfillment_mode           TEXT NOT NULL
                               CHECK (fulfillment_mode IN ('bthwani_delivery','partner_delivery','pickup')),
    fee_minor_units            BIGINT NOT NULL DEFAULT 0 CHECK (fee_minor_units >= 0),
    currency                   TEXT NOT NULL DEFAULT 'YER',
    status                     TEXT NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','paused','archived')),
    pricing_source             TEXT NOT NULL DEFAULT 'control_panel'
                               CHECK (pricing_source IN ('control_panel','partner_store','platform_default','migration_legacy')),
    created_by_actor_id        TEXT NOT NULL DEFAULT '',
    approved_by_actor_id       TEXT NOT NULL DEFAULT '',
    approved_at                TIMESTAMPTZ,
    version                    INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (store_id, fulfillment_mode)
);

INSERT INTO dsh_store_delivery_pricing
    (store_id,fulfillment_mode,fee_minor_units,currency,status,pricing_source,
     created_by_actor_id,approved_by_actor_id,approved_at)
SELECT s.id,'bthwani_delivery',CASE WHEN s.is_free_delivery THEN 0 ELSE 95000 END,
       'YER','active','migration_legacy','migration:dsh-065','migration:dsh-065',NOW()
FROM dsh_stores s
ON CONFLICT (store_id,fulfillment_mode) DO NOTHING;

INSERT INTO dsh_store_delivery_pricing
    (store_id,fulfillment_mode,fee_minor_units,currency,status,pricing_source,
     created_by_actor_id,approved_by_actor_id,approved_at)
SELECT s.id,'partner_delivery',
       CASE WHEN COALESCE(cs.policy,'free_delivery')='free_delivery' OR s.is_free_delivery THEN 0 ELSE 95000 END,
       'YER','active','migration_legacy','migration:dsh-065','migration:dsh-065',NOW()
FROM dsh_stores s
LEFT JOIN dsh_store_courier_settings cs ON cs.store_id=s.id
ON CONFLICT (store_id,fulfillment_mode) DO NOTHING;

INSERT INTO dsh_store_delivery_pricing
    (store_id,fulfillment_mode,fee_minor_units,currency,status,pricing_source,
     created_by_actor_id,approved_by_actor_id,approved_at)
SELECT s.id,'pickup',0,'YER','active','platform_default',
       'migration:dsh-065','migration:dsh-065',NOW()
FROM dsh_stores s
ON CONFLICT (store_id,fulfillment_mode) DO NOTHING;

ALTER TABLE dsh_checkout_intents
    ADD COLUMN IF NOT EXISTS delivery_fee_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee_minor_units >= 0);
ALTER TABLE dsh_orders
    ADD COLUMN IF NOT EXISTS delivery_fee_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee_minor_units >= 0);
ALTER TABLE dsh_coupon_redemptions
    ADD COLUMN IF NOT EXISTS delivery_fee_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee_minor_units >= 0);

ALTER TABLE dsh_checkout_intents
    DROP CONSTRAINT IF EXISTS dsh_checkout_intents_pricing_totals_chk;
ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_pricing_totals_chk
    CHECK (total_minor_units = GREATEST(subtotal_minor_units + delivery_fee_minor_units - discount_minor_units, 0));

ALTER TABLE dsh_orders
    DROP CONSTRAINT IF EXISTS dsh_orders_pricing_totals_chk;
ALTER TABLE dsh_orders
    ADD CONSTRAINT dsh_orders_pricing_totals_chk
    CHECK (total_minor_units = GREATEST(subtotal_minor_units + delivery_fee_minor_units - discount_minor_units, 0));

ALTER TABLE dsh_coupon_redemptions
    DROP CONSTRAINT IF EXISTS dsh_coupon_redemptions_pricing_totals_chk;
ALTER TABLE dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_pricing_totals_chk
    CHECK (total_minor_units = GREATEST(subtotal_minor_units + delivery_fee_minor_units - discount_minor_units, 0));

CREATE OR REPLACE FUNCTION dsh_apply_checkout_pricing_to_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    checkout_pricing RECORD;
    committed_rows INTEGER;
BEGIN
    SELECT subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,
           total_minor_units,currency,pricing_snapshot_hash,coupon_id,
           coupon_redemption_id,coupon_code_last4
    INTO checkout_pricing
    FROM dsh_checkout_intents
    WHERE id=NEW.checkout_intent_id
    FOR UPDATE;

    IF NOT FOUND OR checkout_pricing.subtotal_minor_units<=0
       OR checkout_pricing.total_minor_units<=0
       OR checkout_pricing.total_minor_units<>
          checkout_pricing.subtotal_minor_units+checkout_pricing.delivery_fee_minor_units-checkout_pricing.discount_minor_units
       OR checkout_pricing.pricing_snapshot_hash='' THEN
        RAISE EXCEPTION 'checkout pricing snapshot is missing or invalid';
    END IF;

    NEW.subtotal_minor_units:=checkout_pricing.subtotal_minor_units;
    NEW.delivery_fee_minor_units:=checkout_pricing.delivery_fee_minor_units;
    NEW.discount_minor_units:=checkout_pricing.discount_minor_units;
    NEW.total_minor_units:=checkout_pricing.total_minor_units;
    NEW.currency:=checkout_pricing.currency;
    NEW.pricing_snapshot_hash:=checkout_pricing.pricing_snapshot_hash;
    NEW.coupon_id:=checkout_pricing.coupon_id;
    NEW.coupon_redemption_id:=checkout_pricing.coupon_redemption_id;
    NEW.coupon_code_last4:=checkout_pricing.coupon_code_last4;

    IF checkout_pricing.coupon_id IS NOT NULL THEN
        UPDATE dsh_coupon_redemptions
        SET status='committed',order_id=NEW.id,committed_at=NOW(),updated_at=NOW()
        WHERE id=checkout_pricing.coupon_redemption_id
          AND checkout_intent_id=NEW.checkout_intent_id
          AND status='reserved' AND reserved_until>NOW();
        GET DIAGNOSTICS committed_rows=ROW_COUNT;
        IF committed_rows<>1 THEN
            RAISE EXCEPTION 'coupon reservation is missing, expired, or already consumed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_protect_order_pricing_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF ROW(NEW.subtotal_minor_units,NEW.delivery_fee_minor_units,NEW.discount_minor_units,
           NEW.total_minor_units,NEW.currency,NEW.pricing_snapshot_hash,NEW.coupon_id,
           NEW.coupon_redemption_id,NEW.coupon_code_last4)
       IS DISTINCT FROM
       ROW(OLD.subtotal_minor_units,OLD.delivery_fee_minor_units,OLD.discount_minor_units,
           OLD.total_minor_units,OLD.currency,OLD.pricing_snapshot_hash,OLD.coupon_id,
           OLD.coupon_redemption_id,OLD.coupon_code_last4) THEN
        RAISE EXCEPTION 'order pricing snapshot is immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_dsh_store_delivery_pricing_status
    ON dsh_store_delivery_pricing(status,fulfillment_mode);

COMMENT ON TABLE dsh_store_delivery_pricing IS
    'Sovereign DSH delivery-fee source consumed by checkout before WLT handoff.';
