-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-024: Durable outbox for WLT delivery-completion notifications
-- A captain's proof-of-delivery submission must never lose the signal that
-- tells WLT to open a COD collection record. This table is written inside
-- the same transaction that confirms PoD, so the event survives even if WLT
-- is unreachable at the moment of delivery; a background worker retries it.

CREATE TABLE IF NOT EXISTS dsh_wlt_outbox_events (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type         TEXT        NOT NULL,
    order_id           UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    captain_id         TEXT        NOT NULL,
    partner_id         TEXT        NOT NULL,
    checkout_intent_id UUID        NOT NULL REFERENCES dsh_checkout_intents(id),
    status             TEXT        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'sent', 'failed')),
    attempt_count      INT         NOT NULL DEFAULT 0,
    last_error         TEXT,
    next_retry_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_dsh_wlt_outbox_events_pending
    ON dsh_wlt_outbox_events(next_retry_at)
    WHERE status = 'pending';
