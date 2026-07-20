-- DSH-092: governed platform-captain delivery exception lifecycle.
-- Exceptions overlay the current delivery stage; they do not invent a new order
-- status or mutate financial truth. Operations must resolve the overlay before
-- delivery progression or proof-of-delivery can continue.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_delivery_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    assignment_id UUID NOT NULL REFERENCES dsh_assignments(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    captain_id TEXT NOT NULL,
    reason_code TEXT NOT NULL CHECK (reason_code IN (
        'customer_unreachable',
        'recipient_refused',
        'wrong_address',
        'unsafe_location',
        'vehicle_breakdown',
        'accident',
        'damaged_order',
        'cash_collection_issue',
        'weather_or_road_block',
        'proof_unavailable',
        'other'
    )),
    note TEXT NOT NULL DEFAULT '',
    delivery_status_at_report TEXT NOT NULL CHECK (delivery_status_at_report IN (
        'driver_assigned',
        'driver_arrived_store',
        'picked_up',
        'arrived_customer'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    correlation_id TEXT NOT NULL,
    reported_latitude DOUBLE PRECISION,
    reported_longitude DOUBLE PRECISION,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by_actor_id TEXT,
    resolution_action TEXT CHECK (resolution_action IS NULL OR resolution_action IN (
        'retry_same_captain',
        'reassign_captain',
        'return_to_store',
        'cancel_order'
    )),
    resolution_note TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_delivery_exceptions_location_pair_check CHECK (
        (reported_latitude IS NULL AND reported_longitude IS NULL) OR
        (reported_latitude BETWEEN -90 AND 90 AND reported_longitude BETWEEN -180 AND 180)
    ),
    CONSTRAINT dsh_delivery_exceptions_resolution_shape_check CHECK (
        (status = 'resolved' AND resolved_at IS NOT NULL AND resolved_by_actor_id IS NOT NULL
         AND resolution_action IS NOT NULL AND NULLIF(BTRIM(resolution_note), '') IS NOT NULL)
        OR
        (status <> 'resolved' AND resolved_at IS NULL AND resolved_by_actor_id IS NULL
         AND resolution_action IS NULL AND resolution_note IS NULL)
    ),
    CONSTRAINT dsh_delivery_exceptions_correlation_unique UNIQUE (tenant_id, correlation_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_delivery_exceptions_active_assignment
    ON dsh_delivery_exceptions(assignment_id)
    WHERE status IN ('open', 'acknowledged');

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_operator_queue
    ON dsh_delivery_exceptions(status, severity, reported_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_order
    ON dsh_delivery_exceptions(order_id, reported_at DESC);

COMMIT;
