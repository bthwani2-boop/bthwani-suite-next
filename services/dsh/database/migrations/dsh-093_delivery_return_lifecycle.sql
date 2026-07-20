-- DSH-093: explicit return-to-store lifecycle after pickup.
-- Returning an order does not create a refund. Financial cancellation remains
-- governed by the existing DSH cancellation -> WLT closure journey.

BEGIN;

ALTER TABLE dsh_orders DROP CONSTRAINT IF EXISTS dsh_orders_status_check;
ALTER TABLE dsh_orders ADD CONSTRAINT dsh_orders_status_check CHECK (status IN (
    'pending','store_accepted','preparing','ready_for_pickup','driver_assigned',
    'driver_arrived_store','picked_up','arrived_customer','returning_to_store',
    'returned_to_store','delivered','cancelled_by_client','cancelled_by_store',
    'cancelled_by_operator','cancelled_no_driver','failed_payment','failed_dispatch'
));

ALTER TABLE dsh_deliveries DROP CONSTRAINT IF EXISTS dsh_deliveries_status_check;
ALTER TABLE dsh_deliveries ADD CONSTRAINT dsh_deliveries_status_check CHECK (status IN (
    'assigned','driver_assigned','driver_arrived_store','picked_up','arrived_customer',
    'returning_to_store','returned_to_store','delivered','cancelled'
));

ALTER TABLE dsh_delivery_exceptions
    ADD COLUMN IF NOT EXISTS return_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

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
                 AND return_started_at IS NULL AND returned_at IS NULL)
                OR
                (resolution_action = 'return_to_store'
                 AND replacement_assignment_id IS NULL
                 AND replacement_captain_id IS NULL
                 AND return_started_at IS NOT NULL
                 AND (returned_at IS NULL OR returned_at >= return_started_at))
                OR
                (resolution_action NOT IN ('reassign_captain','return_to_store')
                 AND replacement_assignment_id IS NULL
                 AND replacement_captain_id IS NULL
                 AND return_started_at IS NULL AND returned_at IS NULL)
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
            AND returned_at IS NULL
        )
    );

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_return_queue
    ON dsh_delivery_exceptions(returned_at, return_started_at DESC)
    WHERE resolution_action = 'return_to_store';

COMMIT;
