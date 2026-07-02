-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-007: Dispatch & Captain Delivery Lifecycle
-- DSH owns assignment and delivery lifecycle state only.
-- WLT remains the owner of captain earnings, COD, settlement, refund, and ledger truth.

ALTER TABLE dsh_orders DROP CONSTRAINT IF EXISTS dsh_orders_status_check;
ALTER TABLE dsh_orders ADD CONSTRAINT dsh_orders_status_check
    CHECK (status IN (
        'pending',
        'store_accepted',
        'preparing',
        'ready_for_pickup',
        'driver_assigned',
        'driver_arrived_store',
        'picked_up',
        'arrived_customer',
        'delivered',
        'cancelled'
    ));

ALTER TABLE dsh_order_status_events DROP CONSTRAINT IF EXISTS dsh_order_status_events_actor_role_check;
ALTER TABLE dsh_order_status_events ADD CONSTRAINT dsh_order_status_events_actor_role_check
    CHECK (actor_role IN ('client', 'partner', 'captain', 'operator', 'system'));

CREATE TABLE IF NOT EXISTS dsh_assignments (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id             UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    captain_id           TEXT        NOT NULL,
    assigned_by          TEXT        NOT NULL,
    status               TEXT        NOT NULL DEFAULT 'offered'
                                        CHECK (status IN ('offered', 'accepted', 'declined', 'completed')),
    response_deadline_at TIMESTAMPTZ NOT NULL,
    accepted_at          TIMESTAMPTZ,
    declined_at          TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_deliveries (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL UNIQUE REFERENCES dsh_assignments(id) ON DELETE CASCADE,
    order_id      UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    captain_id    TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'assigned'
                              CHECK (status IN (
                                  'assigned',
                                  'driver_assigned',
                                  'driver_arrived_store',
                                  'picked_up',
                                  'arrived_customer',
                                  'delivered'
                              )),
    pod_method    TEXT,
    pod_reference TEXT,
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_assignments_active_order
    ON dsh_assignments(order_id)
    WHERE status IN ('offered', 'accepted');
CREATE INDEX IF NOT EXISTS idx_dsh_assignments_captain_status
    ON dsh_assignments(captain_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_deliveries_order
    ON dsh_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_dsh_deliveries_captain_status
    ON dsh_deliveries(captain_id, status, updated_at DESC);
