-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-005: Checkout Intent & WLT Handoff
-- Creates dsh_checkout_intents table for client checkout intent persistence.
-- Financial amounts are NOT computed here — priceReference labels come from catalog/cart.
-- wlt_payment_session_id is an opaque reference string from WLT (CONTRACT_ONLY until WLT-001).
-- DSH never owns payment execution, refund, settlement, or wallet mutation.

CREATE TABLE IF NOT EXISTS dsh_checkout_intents (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               TEXT        NOT NULL,
    cart_id                 UUID        NOT NULL,
    store_id                TEXT        NOT NULL REFERENCES dsh_stores(id),
    fulfillment_mode        TEXT        NOT NULL DEFAULT 'bthwani_delivery'
                                        CHECK (fulfillment_mode IN ('bthwani_delivery', 'partner_delivery', 'pickup')),
    state                   TEXT        NOT NULL DEFAULT 'pending'
                                        CHECK (state IN ('pending', 'payment_pending', 'confirmed', 'cancelled', 'expired')),
    payment_method          TEXT        NOT NULL DEFAULT 'cod'
                                        CHECK (payment_method IN ('cod', 'wallet', 'mixed', 'official_wallet')),
    wlt_payment_session_id  TEXT        NOT NULL DEFAULT '',
    delivery_address        TEXT        NOT NULL DEFAULT '',
    note                    TEXT        NOT NULL DEFAULT '',
    version                 INTEGER     NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_intents_client_id ON dsh_checkout_intents(client_id);
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_intents_cart_id   ON dsh_checkout_intents(cart_id);
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_intents_state     ON dsh_checkout_intents(state);
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_intents_store_id  ON dsh_checkout_intents(store_id);
