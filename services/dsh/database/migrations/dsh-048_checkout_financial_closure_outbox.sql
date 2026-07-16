-- DSH-048: Checkout/order financial closure outbox
-- When a checkout intent is cancelled before an order exists, or an order is
-- rejected/cancelled after a WLT payment session was created, WLT must be
-- told to close out that payment session (expire it, or decide whether to
-- refund/no-op for an already-cancelled order). This table provides the
-- durable outbox for that delivery, written inside the same transaction that
-- commits the intent cancellation or order rejection/cancellation. A
-- background worker drains pending rows with retryable backoff until WLT
-- acknowledges the closure.

CREATE TABLE IF NOT EXISTS dsh_checkout_financial_closure_outbox (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type         TEXT        NOT NULL CHECK (event_type IN ('expire_session', 'cancel_for_order')),
    checkout_intent_id UUID        NOT NULL REFERENCES dsh_checkout_intents(id),
    payment_session_id TEXT        NOT NULL,
    order_id           UUID        REFERENCES dsh_orders(id) ON DELETE CASCADE,
    client_id          TEXT        NOT NULL,
    reason             TEXT        NOT NULL DEFAULT '',
    status             TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
    attempt_count      INT         NOT NULL DEFAULT 0,
    last_error         TEXT,
    next_retry_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (payment_session_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_financial_closure_outbox_pending
    ON dsh_checkout_financial_closure_outbox(next_retry_at)
    WHERE status = 'pending';
