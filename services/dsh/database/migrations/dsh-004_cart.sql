-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-004: Cart & Serviceability Quote
-- Creates dsh_carts and dsh_cart_items tables for client cart persistence.
-- Financial amounts are NOT stored here — priceReference is a display label from the catalog.
-- Serviceability check uses store and zone metadata only (no financial computation).

CREATE TABLE IF NOT EXISTS dsh_carts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       TEXT        NOT NULL,
    store_id        TEXT        NOT NULL REFERENCES dsh_stores(id),
    fulfillment_mode TEXT       NOT NULL DEFAULT 'bthwani_delivery'
                                CHECK (fulfillment_mode IN ('bthwani_delivery', 'partner_delivery', 'pickup')),
    state           TEXT        NOT NULL DEFAULT 'active'
                                CHECK (state IN ('active', 'checked_out', 'abandoned')),
    note            TEXT        NOT NULL DEFAULT '',
    version         INTEGER     NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_cart_items (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id         UUID        NOT NULL REFERENCES dsh_carts(id) ON DELETE CASCADE,
    product_id      TEXT        NOT NULL,
    product_name    TEXT        NOT NULL,
    price_reference TEXT        NOT NULL DEFAULT '',
    quantity        INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
    version         INTEGER     NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_carts_client_id   ON dsh_carts(client_id);
CREATE INDEX IF NOT EXISTS idx_dsh_carts_store_id    ON dsh_carts(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_carts_state       ON dsh_carts(state);
CREATE INDEX IF NOT EXISTS idx_dsh_cart_items_cart   ON dsh_cart_items(cart_id);
