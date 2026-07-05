-- WLT-009: Durable outbox for payment-session outcome notifications to DSH.
-- WLT is the sole owner of payment authorization/capture truth; losing a
-- terminal-outcome webhook to DSH must never leave a checkout intent stuck
-- in payment_pending. This table is written inside the same transaction that
-- commits the session's terminal status, so the notification survives a DSH
-- outage; a background worker retries it with backoff until DSH accepts it.

CREATE TABLE IF NOT EXISTS wlt_dsh_outbox_events (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type         TEXT        NOT NULL,
    payment_session_id TEXT        NOT NULL REFERENCES wlt_payment_sessions(id) ON DELETE CASCADE,
    checkout_intent_id TEXT        NOT NULL,
    status             TEXT        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'sent')),
    attempt_count      INT         NOT NULL DEFAULT 0,
    last_error         TEXT,
    next_retry_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (payment_session_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_wlt_dsh_outbox_events_pending
    ON wlt_dsh_outbox_events(next_retry_at)
    WHERE status = 'pending';
