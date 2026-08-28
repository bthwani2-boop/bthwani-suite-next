-- WLT-953: promotion-funding command identity must gate financial effects.
BEGIN;

-- A transition command and its reservation mutation, audit event, and ledger
-- effect commit as one transaction. A crash before commit rolls back the claim;
-- a committed command is replayed from this registry without repeating money.
CREATE TABLE IF NOT EXISTS wlt_promotion_funding_commands (
    id TEXT PRIMARY KEY DEFAULT ('pfc_' || replace(gen_random_uuid()::text, '-', '')),
    operator_context_id TEXT NOT NULL,
    reservation_id TEXT NOT NULL REFERENCES wlt_promotion_funding_reservations(id) ON DELETE RESTRICT,
    operation TEXT NOT NULL CHECK (operation IN ('commit', 'release', 'reverse')),
    target_status TEXT NOT NULL CHECK (target_status IN ('committed', 'released', 'reversed')),
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL CHECK (length(request_hash) = 64),
    state TEXT NOT NULL DEFAULT 'claimed' CHECK (state IN ('claimed', 'completed')),
    result_status TEXT NOT NULL DEFAULT '',
    result_ledger_transaction_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_wlt_promotion_funding_command_identity
        UNIQUE (operator_context_id, reservation_id, operation, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_wlt_promotion_funding_commands_recovery
    ON wlt_promotion_funding_commands(state, created_at)
    WHERE state = 'claimed';

COMMENT ON TABLE wlt_promotion_funding_commands IS
    'Canonical command identity and exact replay receipt for promotion-funding financial transitions.';

COMMIT;
