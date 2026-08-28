-- DSH-1047: Durable cross-service mutation boundaries for SpecialRequest flows.
-- The saga row is the durable command identity and state machine. The outbox row
-- is created in the same transaction so a committed local intent is dispatchable
-- after an API restart.

CREATE TABLE IF NOT EXISTS dsh_special_request_sagas (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_context_id   TEXT NOT NULL,
    special_request_id    UUID NOT NULL REFERENCES dsh_special_requests(id),
    operation             TEXT NOT NULL CHECK (operation IN (
        'quote_issue_attach',
        'payment_session_create_attach',
        'cancel'
    )),
    command_id            TEXT NOT NULL,
    payload               JSONB NOT NULL,
    payload_hash          TEXT NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
    state                 TEXT NOT NULL DEFAULT 'requested' CHECK (state IN (
        'requested',
        'dispatched',
        'remote_applied',
        'locally_confirmed',
        'completed',
        'retryable_failure',
        'reconciliation_required',
        'terminal_failure'
    )),
    remote_reference      TEXT,
    attempt_count         INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    last_error            TEXT,
    next_attempt_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_context_id, command_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_special_request_sagas_dispatch
    ON dsh_special_request_sagas (state, next_attempt_at, updated_at)
    WHERE state IN ('requested', 'dispatched', 'remote_applied', 'retryable_failure');

CREATE INDEX IF NOT EXISTS idx_dsh_special_request_sagas_subject
    ON dsh_special_request_sagas (operator_context_id, special_request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_special_request_saga_outbox (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id               UUID NOT NULL UNIQUE REFERENCES dsh_special_request_sagas(id) ON DELETE CASCADE,
    status                TEXT NOT NULL DEFAULT 'blocked' CHECK (status IN ('blocked', 'pending', 'in_flight', 'sent', 'failed')),
    attempt_count         INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error            TEXT,
    sent_at               TIMESTAMPTZ,
    failed_at             TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_special_request_saga_outbox_dispatch
    ON dsh_special_request_saga_outbox (status, next_attempt_at, created_at)
    WHERE status IN ('pending', 'in_flight');

COMMENT ON TABLE dsh_special_request_sagas IS
    'Durable command identity and explicit state machine for DSH/WLT SpecialRequest mutations.';
COMMENT ON TABLE dsh_special_request_saga_outbox IS
    'Transactional outbox for SpecialRequest cross-service saga dispatch and restart recovery.';
