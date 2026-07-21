-- DSH-095: dual custody handshake for outbound bthwani deliveries.
-- Captain arrival does not prove that the store released the package. The owning
-- partner confirms release first; only then may the assigned captain confirm pickup.
-- Reassignments retain prior attempts as superseded audit records.

BEGIN;

ALTER TABLE dsh_orders DROP CONSTRAINT IF EXISTS dsh_orders_status_check;
ALTER TABLE dsh_orders ADD CONSTRAINT dsh_orders_status_check
    CHECK (status IN (
        'pending',
        'store_accepted',
        'preparing',
        'ready_for_pickup',
        'driver_assigned',
        'driver_arrived_store',
        'store_handoff_confirmed',
        'picked_up',
        'arrived_customer',
        'returning_to_store',
        'return_arrived_store',
        'returned_to_store',
        'delivered',
        'cancelled_by_client',
        'cancelled_by_store',
        'cancelled_by_operator',
        'cancelled_no_driver',
        'failed_payment',
        'failed_dispatch'
    ));

CREATE TABLE IF NOT EXISTS dsh_store_captain_handoffs (
    id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                        UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    assignment_id                   UUID        NOT NULL UNIQUE REFERENCES dsh_assignments(id) ON DELETE CASCADE,
    store_id                        TEXT        NOT NULL,
    captain_id                      TEXT        NOT NULL,
    status                          TEXT        NOT NULL DEFAULT 'awaiting_partner'
                                                CHECK (status IN ('awaiting_partner','partner_confirmed','completed','superseded')),
    partner_confirmed_at            TIMESTAMPTZ,
    partner_confirmed_by_actor_id   TEXT,
    captain_confirmed_at            TIMESTAMPTZ,
    captain_confirmed_by_actor_id   TEXT,
    version                         INTEGER     NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_store_captain_handoffs_shape_check CHECK (
        (status = 'awaiting_partner'
         AND partner_confirmed_at IS NULL
         AND partner_confirmed_by_actor_id IS NULL
         AND captain_confirmed_at IS NULL
         AND captain_confirmed_by_actor_id IS NULL)
        OR
        (status = 'partner_confirmed'
         AND partner_confirmed_at IS NOT NULL
         AND NULLIF(BTRIM(partner_confirmed_by_actor_id), '') IS NOT NULL
         AND captain_confirmed_at IS NULL
         AND captain_confirmed_by_actor_id IS NULL)
        OR
        (status = 'completed'
         AND partner_confirmed_at IS NOT NULL
         AND NULLIF(BTRIM(partner_confirmed_by_actor_id), '') IS NOT NULL
         AND captain_confirmed_at IS NOT NULL
         AND captain_confirmed_at >= partner_confirmed_at
         AND NULLIF(BTRIM(captain_confirmed_by_actor_id), '') IS NOT NULL)
        OR
        (status = 'superseded'
         AND captain_confirmed_at IS NULL
         AND captain_confirmed_by_actor_id IS NULL
         AND ((partner_confirmed_at IS NULL AND partner_confirmed_by_actor_id IS NULL)
              OR (partner_confirmed_at IS NOT NULL
                  AND NULLIF(BTRIM(partner_confirmed_by_actor_id), '') IS NOT NULL)))
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_store_captain_handoffs_active_order
    ON dsh_store_captain_handoffs(order_id)
    WHERE status IN ('awaiting_partner','partner_confirmed');
CREATE INDEX IF NOT EXISTS idx_dsh_store_captain_handoffs_store_status
    ON dsh_store_captain_handoffs(store_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_store_captain_handoffs_captain_status
    ON dsh_store_captain_handoffs(captain_id, status, updated_at DESC);

COMMIT;
