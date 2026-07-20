-- DSH-090: Governed order cancellation, refund and financial-closure projection.
-- DSH owns operational cancellation truth. WLT remains the sole owner of
-- expiration, refund, reversal and reconciliation truth.

BEGIN;

ALTER TABLE dsh_orders
    ADD COLUMN IF NOT EXISTS cancellation_reason_code TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_note TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by_actor_id TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by_role TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS financial_closure_status TEXT NOT NULL DEFAULT 'not_required',
    ADD COLUMN IF NOT EXISTS financial_closure_reference TEXT;

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
        'cancelled',
        'cancelled_by_client',
        'cancelled_by_store',
        'cancelled_by_operator',
        'cancelled_no_driver',
        'failed_payment',
        'failed_dispatch'
    ));

ALTER TABLE dsh_orders DROP CONSTRAINT IF EXISTS dsh_orders_cancelled_by_role_check;
ALTER TABLE dsh_orders ADD CONSTRAINT dsh_orders_cancelled_by_role_check
    CHECK (cancelled_by_role IS NULL OR cancelled_by_role IN ('client','partner','operator','system'));

ALTER TABLE dsh_orders DROP CONSTRAINT IF EXISTS dsh_orders_financial_closure_status_check;
ALTER TABLE dsh_orders ADD CONSTRAINT dsh_orders_financial_closure_status_check
    CHECK (financial_closure_status IN (
        'not_required',
        'pending',
        'session_expired',
        'refund_requested',
        'refund_completed',
        'no_action',
        'failed'
    ));

-- Preserve old rows while removing the ambiguous generic terminal state.
WITH latest_actor AS (
    SELECT DISTINCT ON (order_id)
           order_id,
           actor_role
    FROM dsh_order_status_events
    WHERE to_status = 'cancelled'
    ORDER BY order_id, created_at DESC
)
UPDATE dsh_orders o
SET status = CASE latest_actor.actor_role
        WHEN 'client' THEN 'cancelled_by_client'
        WHEN 'partner' THEN 'cancelled_by_store'
        ELSE 'cancelled_by_operator'
    END,
    cancelled_by_role = COALESCE(o.cancelled_by_role, latest_actor.actor_role, 'operator'),
    cancelled_at = COALESCE(o.cancelled_at, o.updated_at),
    cancellation_note = COALESCE(o.cancellation_note, o.rejection_reason)
FROM latest_actor
WHERE o.id = latest_actor.order_id
  AND o.status = 'cancelled';

UPDATE dsh_orders
SET status = 'cancelled_by_operator',
    cancelled_by_role = COALESCE(cancelled_by_role, 'operator'),
    cancelled_at = COALESCE(cancelled_at, updated_at),
    cancellation_note = COALESCE(cancellation_note, rejection_reason)
WHERE status = 'cancelled';

CREATE TABLE IF NOT EXISTS dsh_order_cancellations (
    id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                   UUID        NOT NULL UNIQUE REFERENCES dsh_orders(id) ON DELETE CASCADE,
    tenant_id                  TEXT        NOT NULL,
    actor_id                   TEXT        NOT NULL,
    actor_role                 TEXT        NOT NULL CHECK (actor_role IN ('client','partner','operator','system')),
    reason_code                TEXT        NOT NULL,
    reason_note                TEXT,
    from_status                TEXT        NOT NULL,
    to_status                  TEXT        NOT NULL,
    financial_closure_status   TEXT        NOT NULL DEFAULT 'pending',
    financial_reference        TEXT,
    correlation_id             TEXT        NOT NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_order_cancellations_order
    ON dsh_order_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_dsh_order_cancellations_financial_status
    ON dsh_order_cancellations(financial_closure_status, updated_at DESC);

ALTER TABLE dsh_checkout_financial_closure_outbox
    ADD COLUMN IF NOT EXISTS result_action TEXT,
    ADD COLUMN IF NOT EXISTS result_reference TEXT,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS correlation_id TEXT;

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_financial_closure_outbox_order
    ON dsh_checkout_financial_closure_outbox(order_id, created_at DESC)
    WHERE order_id IS NOT NULL;

COMMIT;
