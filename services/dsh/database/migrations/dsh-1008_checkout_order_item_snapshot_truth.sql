-- DSH-1008: close checkout -> order commercial truth at one durable snapshot boundary.
--
-- Checkout already freezes pricing totals and the cart hash before the WLT handoff.
-- Persist the exact cart header and item lines in DSH in the same transaction so
-- order creation never re-derives commercial truth from a mutable live cart.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_checkout_cart_snapshots (
    checkout_intent_id    UUID        PRIMARY KEY
                                      REFERENCES dsh_checkout_intents(id) ON DELETE RESTRICT,
    operator_context_id   TEXT        NOT NULL,
    client_id             TEXT        NOT NULL,
    cart_id               UUID        NOT NULL REFERENCES dsh_carts(id) ON DELETE RESTRICT,
    store_id              TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE RESTRICT,
    cart_version          INTEGER     NOT NULL CHECK (cart_version > 0),
    cart_snapshot_hash    TEXT        NOT NULL CHECK (cart_snapshot_hash ~ '^[0-9a-f]{64}$'),
    subtotal_minor_units  BIGINT      NOT NULL CHECK (subtotal_minor_units > 0),
    currency              TEXT        NOT NULL CHECK (currency = UPPER(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
    item_count            INTEGER     NOT NULL CHECK (item_count > 0),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_cart_snapshots_actor
    ON dsh_checkout_cart_snapshots(operator_context_id, client_id, checkout_intent_id);
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_cart_snapshots_cart
    ON dsh_checkout_cart_snapshots(cart_id, cart_version);

CREATE TABLE IF NOT EXISTS dsh_checkout_item_snapshots (
    checkout_intent_id     UUID        NOT NULL
                                       REFERENCES dsh_checkout_cart_snapshots(checkout_intent_id) ON DELETE RESTRICT,
    line_number            INTEGER     NOT NULL CHECK (line_number > 0),
    product_id             TEXT        NOT NULL,
    product_name           TEXT        NOT NULL,
    quantity               INTEGER     NOT NULL CHECK (quantity > 0),
    unit_price_minor       BIGINT      NOT NULL CHECK (unit_price_minor > 0),
    currency               TEXT        NOT NULL CHECK (currency = UPPER(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
    line_total_minor_units BIGINT      NOT NULL CHECK (line_total_minor_units > 0),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (checkout_intent_id, line_number),
    UNIQUE (checkout_intent_id, product_id),
    CHECK (line_total_minor_units = unit_price_minor * quantity)
);

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_item_snapshots_product
    ON dsh_checkout_item_snapshots(product_id, checkout_intent_id);

CREATE OR REPLACE FUNCTION dsh_protect_checkout_cart_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'checkout cart snapshot is immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_protect_checkout_cart_snapshot ON dsh_checkout_cart_snapshots;
CREATE TRIGGER trg_dsh_protect_checkout_cart_snapshot
BEFORE UPDATE ON dsh_checkout_cart_snapshots
FOR EACH ROW EXECUTE FUNCTION dsh_protect_checkout_cart_snapshot();

CREATE OR REPLACE FUNCTION dsh_protect_checkout_item_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'checkout item snapshot is immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_protect_checkout_item_snapshot ON dsh_checkout_item_snapshots;
CREATE TRIGGER trg_dsh_protect_checkout_item_snapshot
BEFORE UPDATE ON dsh_checkout_item_snapshots
FOR EACH ROW EXECUTE FUNCTION dsh_protect_checkout_item_snapshot();

COMMENT ON TABLE dsh_checkout_cart_snapshots IS
    'Canonical DSH checkout commercial snapshot header captured atomically before the WLT handoff.';
COMMENT ON TABLE dsh_checkout_item_snapshots IS
    'Canonical immutable checkout item lines consumed by order creation; live cart state is never an order-line source.';

COMMIT;
