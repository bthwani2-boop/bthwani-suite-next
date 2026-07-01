-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-006: Order Fulfillment & Partner Acceptance
-- Creates dsh_orders, dsh_order_items, dsh_order_status_events tables.
-- Financial truth (settlement, refund, payment mutation) belongs to WLT — not stored here.
-- wlt_payment_ref_id is a read-only bridge reference from WLT (opaque, never mutated by DSH).
-- store_id is TEXT (matches dsh_stores.id which is TEXT — not UUID).
-- checkout_intent_id is UUID FK referencing dsh_checkout_intents(id).

CREATE TABLE IF NOT EXISTS dsh_orders (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_intent_id  UUID        NOT NULL REFERENCES dsh_checkout_intents(id),
    store_id            TEXT        NOT NULL REFERENCES dsh_stores(id),
    client_id           TEXT        NOT NULL,
    status              TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN (
                                        'pending',
                                        'store_accepted',
                                        'preparing',
                                        'ready_for_pickup',
                                        'cancelled'
                                    )),
    rejection_reason    TEXT,
    wlt_payment_ref_id  TEXT        NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_order_items (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID          NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    product_id   TEXT          NOT NULL,
    product_name TEXT          NOT NULL,
    quantity     INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS dsh_order_status_events (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    actor_role  TEXT        NOT NULL CHECK (actor_role IN ('client', 'partner', 'operator', 'system')),
    from_status TEXT        NOT NULL,
    to_status   TEXT        NOT NULL,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_orders_store_id           ON dsh_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_orders_client_id          ON dsh_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_dsh_orders_status             ON dsh_orders(status);
CREATE INDEX IF NOT EXISTS idx_dsh_orders_checkout_intent    ON dsh_orders(checkout_intent_id);
CREATE INDEX IF NOT EXISTS idx_dsh_order_items_order_id      ON dsh_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_dsh_order_status_events_order ON dsh_order_status_events(order_id);
