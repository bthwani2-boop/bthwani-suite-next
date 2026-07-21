-- DSH-097: JRN-023 notification delivery audit, bounded retry and dead-letter state.

ALTER TABLE dsh_operational_outbox_events
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS dsh_notification_delivery_attempts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID        NOT NULL REFERENCES dsh_operational_outbox_events(id) ON DELETE CASCADE,
    attempt_number    INTEGER     NOT NULL CHECK (attempt_number > 0),
    outcome           TEXT        NOT NULL CHECK (outcome IN ('sent','retry_scheduled','dead_letter')),
    error_message     TEXT        NOT NULL DEFAULT '',
    next_retry_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_dsh_notification_delivery_attempts_event
    ON dsh_notification_delivery_attempts(event_id, attempt_number DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_notification_dead_letters
    ON dsh_operational_outbox_events(failed_at DESC)
    WHERE status = 'failed';
