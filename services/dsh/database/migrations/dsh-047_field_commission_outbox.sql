-- DSH-047: Field commission eligibility outbox
-- When a field agent completes a visit, a commission eligibility event must be
-- delivered to WLT inside the same transaction that commits the visit
-- completion. This table provides the durable outbox for that delivery.
-- A background worker drains pending rows with retryable backoff until WLT
-- accepts the event and creates an idempotent commission record.

CREATE TABLE IF NOT EXISTS dsh_field_commission_outbox (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    event_type            TEXT        NOT NULL DEFAULT 'field_visit_commission',
    field_actor_id        TEXT        NOT NULL,
    visit_id              UUID        NOT NULL REFERENCES dsh_field_visits(id) ON DELETE CASCADE,
    store_id              TEXT        NOT NULL,
    partner_id            TEXT,
    commission_policy_id  TEXT,
    correlation_id        UUID        NOT NULL DEFAULT gen_random_uuid(),
    idempotency_key       TEXT        NOT NULL,
    occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status                TEXT        NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending', 'sent', 'failed')),
    attempt_count         INT         NOT NULL DEFAULT 0,
    last_error            TEXT,
    next_retry_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_field_commission_outbox_pending
    ON dsh_field_commission_outbox(next_retry_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_field_commission_outbox_visit
    ON dsh_field_commission_outbox(visit_id);
