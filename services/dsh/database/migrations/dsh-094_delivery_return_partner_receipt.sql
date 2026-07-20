-- DSH-094: dual custody handshake for returned orders.
-- Captain arrival is not store receipt. Only the owning partner may confirm the
-- handoff and unlock returned_to_store / governed financial cancellation.

BEGIN;

ALTER TABLE dsh_orders DROP CONSTRAINT IF EXISTS dsh_orders_status_check;
ALTER TABLE dsh_orders ADD CONSTRAINT dsh_orders_status_check CHECK (status IN (
    'pending','store_accepted','preparing','ready_for_pickup','driver_assigned',
    'driver_arrived_store','picked_up','arrived_customer','returning_to_store',
    'return_arrived_store','returned_to_store','delivered','cancelled_by_client',
    'cancelled_by_store','cancelled_by_operator','cancelled_no_driver',
    'failed_payment','failed_dispatch'
));

ALTER TABLE dsh_deliveries DROP CONSTRAINT IF EXISTS dsh_deliveries_status_check;
ALTER TABLE dsh_deliveries ADD CONSTRAINT dsh_deliveries_status_check CHECK (status IN (
    'assigned','driver_assigned','driver_arrived_store','picked_up','arrived_customer',
    'returning_to_store','return_arrived_store','returned_to_store','delivered','cancelled'
));

ALTER TABLE dsh_delivery_exceptions
    ADD COLUMN IF NOT EXISTS return_arrived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS return_accepted_by_actor_id TEXT;

ALTER TABLE dsh_delivery_exceptions
    DROP CONSTRAINT IF EXISTS dsh_delivery_exceptions_resolution_shape_check;
ALTER TABLE dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_resolution_shape_check CHECK (
        (
            status = 'resolved'
            AND resolved_at IS NOT NULL
            AND resolved_by_actor_id IS NOT NULL
            AND resolution_action IS NOT NULL
            AND NULLIF(BTRIM(resolution_note), '') IS NOT NULL
            AND (
                (resolution_action = 'reassign_captain'
                 AND replacement_assignment_id IS NOT NULL
                 AND NULLIF(BTRIM(replacement_captain_id), '') IS NOT NULL
                 AND return_started_at IS NULL
                 AND return_arrived_at IS NULL
                 AND returned_at IS NULL
                 AND return_accepted_by_actor_id IS NULL)
                OR
                (resolution_action = 'return_to_store'
                 AND replacement_assignment_id IS NULL
                 AND replacement_captain_id IS NULL
                 AND return_started_at IS NOT NULL
                 AND (return_arrived_at IS NULL OR return_arrived_at >= return_started_at)
                 AND (returned_at IS NULL OR (
                     return_arrived_at IS NOT NULL
                     AND returned_at >= return_arrived_at
                     AND NULLIF(BTRIM(return_accepted_by_actor_id), '') IS NOT NULL
                 ))
                 AND (returned_at IS NOT NULL OR return_accepted_by_actor_id IS NULL))
                OR
                (resolution_action NOT IN ('reassign_captain','return_to_store')
                 AND replacement_assignment_id IS NULL
                 AND replacement_captain_id IS NULL
                 AND return_started_at IS NULL
                 AND return_arrived_at IS NULL
                 AND returned_at IS NULL
                 AND return_accepted_by_actor_id IS NULL)
            )
        )
        OR
        (
            status <> 'resolved'
            AND resolved_at IS NULL
            AND resolved_by_actor_id IS NULL
            AND resolution_action IS NULL
            AND resolution_note IS NULL
            AND replacement_assignment_id IS NULL
            AND replacement_captain_id IS NULL
            AND return_started_at IS NULL
            AND return_arrived_at IS NULL
            AND returned_at IS NULL
            AND return_accepted_by_actor_id IS NULL
        )
    );

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_partner_return_receipt
    ON dsh_delivery_exceptions(order_id, return_arrived_at DESC)
    WHERE resolution_action='return_to_store' AND returned_at IS NULL;

COMMIT;
