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
    order_id                     UUID REFERENCES dsh_orders(id) ON DELETE RESTRICT,
    status                       TEXT NOT NULL DEFAULT 'reserved'
                                 CHECK (status IN ('reserved','committed','released','reversed')),
    subtotal_minor_units         BIGINT NOT NULL CHECK (subtotal_minor_units > 0),
    discount_minor_units         BIGINT NOT NULL CHECK (discount_minor_units > 0),
    total_minor_units            BIGINT NOT NULL CHECK (total_minor_units >= 0),
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

-- DSH-061 deliberately blocked coupon publication while no engine existed.
-- The authoritative reservation/commit engine above now replaces that gate.
ALTER TABLE dsh_partner_offers
    DROP CONSTRAINT IF EXISTS dsh_partner_offers_coupon_publish_requires_engine_chk;
ALTER TABLE dsh_stores
    DROP CONSTRAINT IF EXISTS dsh_stores_coupon_badge_requires_engine_chk;

COMMENT ON TABLE dsh_coupon_redemptions IS
    'Authoritative idempotent coupon lifecycle: reserve before WLT, commit on order, release on failure/cancel, reverse on refund.';
COMMENT ON COLUMN dsh_checkout_intents.pricing_snapshot_hash IS
    'Hash of cart price snapshot plus applied commercial effects; sent to WLT with total_minor_units.';
