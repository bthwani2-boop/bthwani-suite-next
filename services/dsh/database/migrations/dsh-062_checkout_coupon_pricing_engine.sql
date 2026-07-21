-- DSH-062: authoritative checkout coupon pricing and redemption engine
--
-- Coupon discounts are DSH commercial-pricing facts. WLT receives only the
-- final authoritative amount and pricing snapshot hash. Redemptions are
-- reserved before WLT handoff, committed when the order is created, released
-- on cancellation/payment failure, and reversible after governed refunds.

CREATE TABLE IF NOT EXISTS dsh_coupons (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar                      TEXT NOT NULL,
    description                 TEXT NOT NULL DEFAULT '',
    code_hash                    TEXT NOT NULL UNIQUE,
    code_last4                   TEXT NOT NULL CHECK (char_length(code_last4) = 4),
    store_id                     TEXT REFERENCES dsh_stores(id) ON DELETE RESTRICT,
    discount_type                TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
    discount_percent             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    fixed_discount_minor_units   BIGINT NOT NULL DEFAULT 0 CHECK (fixed_discount_minor_units >= 0),
    max_discount_minor_units     BIGINT NOT NULL DEFAULT 0 CHECK (max_discount_minor_units >= 0),
    min_subtotal_minor_units     BIGINT NOT NULL DEFAULT 0 CHECK (min_subtotal_minor_units >= 0),
    global_usage_limit           INTEGER NOT NULL DEFAULT 0 CHECK (global_usage_limit >= 0),
    per_client_usage_limit       INTEGER NOT NULL DEFAULT 1 CHECK (per_client_usage_limit > 0),
    eligible_fulfillment_modes   TEXT[] NOT NULL DEFAULT ARRAY['bthwani_delivery','partner_delivery','pickup']::TEXT[],
    starts_at                    TIMESTAMPTZ,
    ends_at                      TIMESTAMPTZ,
    status                       TEXT NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft','active','paused','archived')),
    created_by_actor_id          TEXT NOT NULL,
    approved_by_actor_id         TEXT NOT NULL DEFAULT '',
    approved_at                  TIMESTAMPTZ,
    version                      INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    archived_at                  TIMESTAMPTZ,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (discount_type='percent' AND discount_percent > 0 AND fixed_discount_minor_units = 0)
        OR
        (discount_type='fixed' AND fixed_discount_minor_units > 0 AND discount_percent = 0)
    ),
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
    CHECK (cardinality(eligible_fulfillment_modes) > 0),
    CHECK (eligible_fulfillment_modes <@ ARRAY['bthwani_delivery','partner_delivery','pickup']::TEXT[])
);

CREATE INDEX IF NOT EXISTS idx_dsh_coupons_status_window
    ON dsh_coupons(status, starts_at, ends_at)
    WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsh_coupons_store
    ON dsh_coupons(store_id)
    WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS dsh_coupon_redemptions (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id                    UUID NOT NULL REFERENCES dsh_coupons(id) ON DELETE RESTRICT,
    client_actor_id              TEXT NOT NULL,
    cart_id                      UUID NOT NULL REFERENCES dsh_carts(id) ON DELETE RESTRICT,
    checkout_intent_id           UUID NOT NULL,
    order_id                     UUID,
    status                       TEXT NOT NULL DEFAULT 'reserved'
                                 CHECK (status IN ('reserved','committed','released','reversed')),
    subtotal_minor_units         BIGINT NOT NULL CHECK (subtotal_minor_units > 0),
    discount_minor_units         BIGINT NOT NULL CHECK (discount_minor_units > 0),
    total_minor_units            BIGINT NOT NULL CHECK (total_minor_units > 0),
    currency                     TEXT NOT NULL DEFAULT 'YER',
    idempotency_key              TEXT NOT NULL UNIQUE,
    reserved_until               TIMESTAMPTZ NOT NULL,
    committed_at                 TIMESTAMPTZ,
    released_at                  TIMESTAMPTZ,
    reversed_at                  TIMESTAMPTZ,
    release_reason               TEXT NOT NULL DEFAULT '',
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_dsh_coupon_redemption_checkout_intent
        FOREIGN KEY (checkout_intent_id)
        REFERENCES dsh_checkout_intents(id)
        ON DELETE RESTRICT
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_dsh_coupon_redemption_order
        FOREIGN KEY (order_id)
        REFERENCES dsh_orders(id)
        ON DELETE RESTRICT
        DEFERRABLE INITIALLY DEFERRED,
    UNIQUE (checkout_intent_id),
    UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_coupon_redemptions_coupon_status
    ON dsh_coupon_redemptions(coupon_id, status, reserved_until);
CREATE INDEX IF NOT EXISTS idx_dsh_coupon_redemptions_client
    ON dsh_coupon_redemptions(coupon_id, client_actor_id, status);

ALTER TABLE dsh_checkout_intents
    ADD COLUMN IF NOT EXISTS subtotal_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS discount_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (discount_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS total_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (total_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'YER',
    ADD COLUMN IF NOT EXISTS pricing_snapshot_hash TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES dsh_coupons(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS coupon_redemption_id UUID REFERENCES dsh_coupon_redemptions(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS coupon_code_last4 TEXT NOT NULL DEFAULT '';

ALTER TABLE dsh_checkout_intents
    DROP CONSTRAINT IF EXISTS dsh_checkout_intents_pricing_totals_chk;
ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_pricing_totals_chk
    CHECK (total_minor_units = GREATEST(subtotal_minor_units - discount_minor_units, 0));

ALTER TABLE dsh_orders
    ADD COLUMN IF NOT EXISTS subtotal_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS discount_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (discount_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS total_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (total_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'YER',
    ADD COLUMN IF NOT EXISTS pricing_snapshot_hash TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES dsh_coupons(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS coupon_redemption_id UUID REFERENCES dsh_coupon_redemptions(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS coupon_code_last4 TEXT NOT NULL DEFAULT '';

ALTER TABLE dsh_orders
    DROP CONSTRAINT IF EXISTS dsh_orders_pricing_totals_chk;
ALTER TABLE dsh_orders
    ADD CONSTRAINT dsh_orders_pricing_totals_chk
    CHECK (total_minor_units = GREATEST(subtotal_minor_units - discount_minor_units, 0));

CREATE OR REPLACE FUNCTION dsh_apply_checkout_pricing_to_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    checkout_pricing RECORD;
    committed_rows INTEGER;
BEGIN
    SELECT subtotal_minor_units, discount_minor_units, total_minor_units, currency,
           pricing_snapshot_hash, coupon_id, coupon_redemption_id, coupon_code_last4
    INTO checkout_pricing
    FROM dsh_checkout_intents
    WHERE id = NEW.checkout_intent_id
    FOR UPDATE;

    IF NOT FOUND OR checkout_pricing.subtotal_minor_units <= 0
       OR checkout_pricing.total_minor_units <= 0
       OR checkout_pricing.total_minor_units <> checkout_pricing.subtotal_minor_units - checkout_pricing.discount_minor_units
       OR checkout_pricing.pricing_snapshot_hash = '' THEN
        RAISE EXCEPTION 'checkout pricing snapshot is missing or invalid';
    END IF;

    NEW.subtotal_minor_units := checkout_pricing.subtotal_minor_units;
    NEW.discount_minor_units := checkout_pricing.discount_minor_units;
    NEW.total_minor_units := checkout_pricing.total_minor_units;
    NEW.currency := checkout_pricing.currency;
    NEW.pricing_snapshot_hash := checkout_pricing.pricing_snapshot_hash;
    NEW.coupon_id := checkout_pricing.coupon_id;
    NEW.coupon_redemption_id := checkout_pricing.coupon_redemption_id;
    NEW.coupon_code_last4 := checkout_pricing.coupon_code_last4;

    IF checkout_pricing.coupon_id IS NOT NULL THEN
        UPDATE dsh_coupon_redemptions
        SET status='committed', order_id=NEW.id, committed_at=NOW(), updated_at=NOW()
        WHERE id=checkout_pricing.coupon_redemption_id
          AND checkout_intent_id=NEW.checkout_intent_id
          AND status='reserved'
          AND reserved_until>NOW();
        GET DIAGNOSTICS committed_rows = ROW_COUNT;
        IF committed_rows <> 1 THEN
            RAISE EXCEPTION 'coupon reservation is missing, expired, or already consumed';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_apply_checkout_pricing_to_order ON dsh_orders;
CREATE TRIGGER trg_dsh_apply_checkout_pricing_to_order
BEFORE INSERT ON dsh_orders
FOR EACH ROW
EXECUTE FUNCTION dsh_apply_checkout_pricing_to_order();

CREATE OR REPLACE FUNCTION dsh_protect_order_pricing_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF ROW(NEW.subtotal_minor_units,NEW.discount_minor_units,NEW.total_minor_units,NEW.currency,
           NEW.pricing_snapshot_hash,NEW.coupon_id,NEW.coupon_redemption_id,NEW.coupon_code_last4)
       IS DISTINCT FROM
       ROW(OLD.subtotal_minor_units,OLD.discount_minor_units,OLD.total_minor_units,OLD.currency,
           OLD.pricing_snapshot_hash,OLD.coupon_id,OLD.coupon_redemption_id,OLD.coupon_code_last4) THEN
        RAISE EXCEPTION 'order pricing snapshot is immutable';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_protect_order_pricing_snapshot ON dsh_orders;
CREATE TRIGGER trg_dsh_protect_order_pricing_snapshot
BEFORE UPDATE ON dsh_orders
FOR EACH ROW
EXECUTE FUNCTION dsh_protect_order_pricing_snapshot();

-- Connect marketing presentation to a real checkout coupon. A coupon offer may
-- exist in review without a link, but publication is impossible until a
-- currently active coupon is linked and scoped to the same store (or global).
ALTER TABLE dsh_partner_offers
    ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES dsh_coupons(id) ON DELETE RESTRICT;
ALTER TABLE dsh_partner_offers
    DROP CONSTRAINT IF EXISTS dsh_partner_offers_coupon_publish_requires_engine_chk;
ALTER TABLE dsh_stores
    DROP CONSTRAINT IF EXISTS dsh_stores_coupon_badge_requires_engine_chk;

CREATE OR REPLACE FUNCTION dsh_validate_published_coupon_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    linked_coupon RECORD;
BEGIN
    IF NEW.offer_type='coupon' AND NEW.status='published' AND NEW.archived_at IS NULL THEN
        IF NEW.coupon_id IS NULL THEN
            RAISE EXCEPTION 'published coupon offer requires coupon_id';
        END IF;
        SELECT id,store_id,status,approved_at,starts_at,ends_at,archived_at
        INTO linked_coupon
        FROM dsh_coupons
        WHERE id=NEW.coupon_id;
        IF NOT FOUND OR linked_coupon.status<>'active' OR linked_coupon.approved_at IS NULL
           OR linked_coupon.archived_at IS NOT NULL
           OR (linked_coupon.store_id IS NOT NULL AND linked_coupon.store_id<>NEW.store_id)
           OR (linked_coupon.starts_at IS NOT NULL AND linked_coupon.starts_at>NOW())
           OR (linked_coupon.ends_at IS NOT NULL AND linked_coupon.ends_at<=NOW()) THEN
            RAISE EXCEPTION 'linked coupon is not active or not eligible for offer store';
        END IF;
    END IF;
    IF NEW.offer_type<>'coupon' AND NEW.coupon_id IS NOT NULL THEN
        RAISE EXCEPTION 'coupon_id is only valid for coupon offers';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_validate_published_coupon_offer ON dsh_partner_offers;
CREATE TRIGGER trg_dsh_validate_published_coupon_offer
BEFORE INSERT OR UPDATE OF offer_type,status,coupon_id,store_id,archived_at
ON dsh_partner_offers
FOR EACH ROW
EXECUTE FUNCTION dsh_validate_published_coupon_offer();

CREATE OR REPLACE FUNCTION dsh_sync_store_coupon_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    affected_store TEXT;
BEGIN
    affected_store := COALESCE(NEW.store_id,OLD.store_id);
    IF affected_store IS NOT NULL THEN
        UPDATE dsh_stores s
        SET has_coupon_badge=EXISTS (
            SELECT 1
            FROM dsh_partner_offers o
            JOIN dsh_coupons c ON c.id=o.coupon_id
            WHERE o.store_id=s.id
              AND o.offer_type='coupon'
              AND o.status='published'
              AND o.archived_at IS NULL
              AND c.status='active'
              AND c.approved_at IS NOT NULL
              AND c.archived_at IS NULL
              AND (c.starts_at IS NULL OR c.starts_at<=NOW())
              AND (c.ends_at IS NULL OR c.ends_at>NOW())
        ), updated_at=NOW()
        WHERE s.id=affected_store;
    END IF;
    IF TG_OP='UPDATE' AND OLD.store_id IS DISTINCT FROM NEW.store_id THEN
        UPDATE dsh_stores s
        SET has_coupon_badge=EXISTS (
            SELECT 1 FROM dsh_partner_offers o
            JOIN dsh_coupons c ON c.id=o.coupon_id
            WHERE o.store_id=s.id AND o.offer_type='coupon' AND o.status='published'
              AND o.archived_at IS NULL AND c.status='active' AND c.approved_at IS NOT NULL
              AND c.archived_at IS NULL AND (c.starts_at IS NULL OR c.starts_at<=NOW())
              AND (c.ends_at IS NULL OR c.ends_at>NOW())
        ), updated_at=NOW()
        WHERE s.id=OLD.store_id;
    END IF;
    RETURN COALESCE(NEW,OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_sync_store_coupon_badge ON dsh_partner_offers;
CREATE TRIGGER trg_dsh_sync_store_coupon_badge
AFTER INSERT OR UPDATE OR DELETE ON dsh_partner_offers
FOR EACH ROW
EXECUTE FUNCTION dsh_sync_store_coupon_badge();

COMMENT ON TABLE dsh_coupon_redemptions IS
    'Authoritative idempotent coupon lifecycle: reserve before WLT, commit on order, release on failure/cancel, reverse on refund.';
COMMENT ON COLUMN dsh_checkout_intents.pricing_snapshot_hash IS
    'Hash of cart price snapshot plus applied commercial effects; sent to WLT with total_minor_units.';
COMMENT ON COLUMN dsh_partner_offers.coupon_id IS
    'Required for published coupon offers; links marketing presentation to the checkout coupon rule.';
