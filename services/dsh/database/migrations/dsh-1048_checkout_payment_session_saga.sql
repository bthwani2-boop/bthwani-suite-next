-- DSH-1048: durable checkout payment-session create/attach saga.
-- A checkout intent must exist before this command is activated. The outbox is
-- created with the intent in one local transaction and dispatches only after
-- that transaction commits.

CREATE TABLE IF NOT EXISTS dsh_checkout_payment_sagas (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_context_id   TEXT NOT NULL,
    checkout_intent_id    UUID NOT NULL REFERENCES dsh_checkout_intents(id),
    client_id             TEXT NOT NULL,
    source_version        INTEGER NOT NULL CHECK (source_version > 0),
    command_id            TEXT NOT NULL,
    payload               JSONB NOT NULL,
    payload_hash          TEXT NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
    state                 TEXT NOT NULL DEFAULT 'ready' CHECK (state IN (
        'ready',
        'dispatched',
        'remote_outcome_unknown',
        'remote_confirmed',
        'local_projection_pending',
        'completed',
        'retry_scheduled',
        'reconciliation_required',
        'compensation_pending',
        'compensated',
        'terminal_failure'
    )),
    payment_session_id    TEXT,
    attempt_count         INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    readback_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (readback_attempt_count >= 0),
    lease_token           UUID,
    lease_expires_at      TIMESTAMPTZ,
    last_error            TEXT,
    next_attempt_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_context_id, command_id),
    CONSTRAINT dsh_checkout_payment_saga_lease_check CHECK (
        state NOT IN ('dispatched', 'remote_outcome_unknown', 'remote_confirmed', 'local_projection_pending')
        OR (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS dsh_checkout_payment_saga_outbox (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id               UUID NOT NULL UNIQUE REFERENCES dsh_checkout_payment_sagas(id) ON DELETE CASCADE,
    status                TEXT NOT NULL DEFAULT 'blocked' CHECK (status IN ('blocked', 'pending', 'in_flight', 'sent', 'failed')),
    attempt_count         INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error            TEXT,
    sent_at               TIMESTAMPTZ,
    failed_at             TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_payment_sagas_recovery
    ON dsh_checkout_payment_sagas (state, next_attempt_at, updated_at)
    WHERE state IN ('ready', 'dispatched', 'remote_outcome_unknown', 'remote_confirmed', 'local_projection_pending', 'retry_scheduled');

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_payment_saga_outbox_recovery
    ON dsh_checkout_payment_saga_outbox (status, next_attempt_at, created_at)
    WHERE status IN ('pending', 'in_flight');

COMMENT ON TABLE dsh_checkout_payment_sagas IS
    'Canonical DSH command identity and state machine for Checkout payment-session create/attach convergence.';
COMMENT ON TABLE dsh_checkout_payment_saga_outbox IS
    'Transactional outbox for Checkout payment-session create/attach dispatch and restart recovery.';
