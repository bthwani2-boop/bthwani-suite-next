-- DSH-098: JRN-021 governed incident lifecycle and append-only audit.
-- DSH owns operational incident state. Payment scope is a reference only and
-- never mutates WLT financial truth.

ALTER TABLE dsh_incidents
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS create_idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS correlation_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_incidents_creator_idempotency
    ON dsh_incidents(raised_by, create_idempotency_key)
    WHERE create_idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS dsh_incident_events (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID        NOT NULL REFERENCES dsh_incidents(id) ON DELETE CASCADE,
    actor_id         TEXT        NOT NULL,
    event_type       TEXT        NOT NULL CHECK (event_type IN (
                                    'created',
                                    'monitoring_started',
                                    'reopened',
                                    'resolved',
                                    'status_changed'
                                )),
    from_status      TEXT,
    to_status        TEXT        NOT NULL CHECK (to_status IN ('open', 'monitoring', 'resolved')),
    correlation_id   TEXT        NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (incident_id, event_type, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_incident_events_incident
    ON dsh_incident_events(incident_id, created_at, id);
