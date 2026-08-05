-- DSH-144: Order Returns Saga
-- Establishes a centralized "DSH Return Case" operational truth that tracks the return lifecycle.
-- Financial truth (Refunds) will be delegated to WLT through the outbox.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_order_returns (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES dsh_orders(id),
    status TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    reason_note TEXT,
    ticket_reference TEXT,
    correlation_id TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_order_returns_status_check CHECK (status IN (
        'submitted', 'review', 'needs_info', 'approved', 'rejected', 'returning', 'financial_pending', 'resolved'
    ))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_order_returns_order_id ON dsh_order_returns(order_id);

CREATE TABLE IF NOT EXISTS dsh_order_return_items (
    return_id TEXT NOT NULL REFERENCES dsh_order_returns(id),
    order_item_id TEXT NOT NULL REFERENCES dsh_order_items(id),
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (return_id, order_item_id)
);

CREATE TABLE IF NOT EXISTS dsh_order_return_actions (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL REFERENCES dsh_order_returns(id),
    actor_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    evidence_ids TEXT[] DEFAULT '{}',
    idempotency_key TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    error_message TEXT,
    CONSTRAINT dsh_order_return_actions_status_check CHECK (status IN ('pending', 'executed', 'failed')),
    CONSTRAINT dsh_order_return_actions_action_check CHECK (action_type IN (
        'start_return',
        'provide_info',
        'approve',
        'reject',
        'require_logistics',
        'complete',
        'refund_wlt'
    ))
);

-- Partial unique index to guarantee single-active-action concurrency.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_order_return_actions_active 
    ON dsh_order_return_actions(return_id) WHERE status = 'pending';

-- Idempotency key uniqueness per return case.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_order_return_actions_idempotency 
    ON dsh_order_return_actions(return_id, idempotency_key);

COMMIT;
