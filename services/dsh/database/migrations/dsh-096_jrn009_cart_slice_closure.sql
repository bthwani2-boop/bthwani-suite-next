-- JRN-009: Cart and Serviceability full-slice closure.
-- DSH owns operational cart, catalog snapshot, serviceability, capacity, and SLA
-- truth. WLT remains the exclusive owner of payment and ledger truth.

BEGIN;

-- Product Truth: one client may have only one active cart. Keep the latest cart
-- deterministically if legacy data contains multiple active store carts.
WITH ranked AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY client_id
               ORDER BY updated_at DESC, created_at DESC, id DESC
           ) AS position
    FROM dsh_carts
    WHERE state = 'active'
)
UPDATE dsh_carts cart
SET state = 'abandoned',
    version = version + 1,
    updated_at = NOW()
FROM ranked
WHERE cart.id = ranked.id
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_carts_single_active_client
    ON dsh_carts (client_id)
    WHERE state = 'active';

CREATE INDEX IF NOT EXISTS idx_dsh_cart_items_assortment_snapshot
    ON dsh_cart_items (store_assortment_id)
    WHERE store_assortment_id IS NOT NULL;

-- Immutable operational evidence for address-owned serviceability checks. This
-- table stores no financial amount and never becomes a WLT ledger source.
CREATE TABLE IF NOT EXISTS dsh_cart_serviceability_checks (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               TEXT        NOT NULL,
    store_id                TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE RESTRICT,
    address_id              TEXT        REFERENCES dsh_client_addresses(id) ON DELETE SET NULL,
    address_version         INTEGER,
    requested_mode          TEXT        NOT NULL CHECK (requested_mode IN ('bthwani_delivery', 'partner_delivery', 'pickup')),
    service_area_code       TEXT        NOT NULL,
    serviceable             BOOLEAN     NOT NULL,
    result_code             TEXT        NOT NULL,
    capacity_state          TEXT        NOT NULL,
    active_orders           INTEGER     NOT NULL DEFAULT 0 CHECK (active_orders >= 0),
    max_concurrent_orders   INTEGER,
    capacity_load_ratio     DOUBLE PRECISION,
    sla_prep_minutes        INTEGER,
    sla_delivery_minutes    INTEGER,
    correlation_id          TEXT,
    checked_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (address_version IS NULL OR address_version >= 1),
    CHECK (max_concurrent_orders IS NULL OR max_concurrent_orders > 0),
    CHECK (capacity_load_ratio IS NULL OR capacity_load_ratio >= 0),
    CHECK (sla_prep_minutes IS NULL OR sla_prep_minutes > 0),
    CHECK (sla_delivery_minutes IS NULL OR sla_delivery_minutes > 0)
);

CREATE INDEX IF NOT EXISTS idx_dsh_cart_serviceability_client_checked
    ON dsh_cart_serviceability_checks (client_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_cart_serviceability_store_checked
    ON dsh_cart_serviceability_checks (store_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_cart_serviceability_blocked
    ON dsh_cart_serviceability_checks (result_code, checked_at DESC)
    WHERE serviceable = FALSE;

COMMIT;
