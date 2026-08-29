-- DSH-1060: make the client order rating pair one durable mutation.
-- The captain and order ratings are one user action and must replay together
-- after an ambiguous response without producing another audit consequence.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_provider_rating_mutation_receipts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_context_id TEXT NOT NULL,
    actor_id            TEXT NOT NULL,
    order_id            UUID NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    idempotency_key     TEXT NOT NULL,
    request_fingerprint TEXT NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
    correlation_id      TEXT NOT NULL,
    captain_rating_id   UUID NOT NULL REFERENCES dsh_provider_ratings(id) ON DELETE CASCADE,
    order_rating_id     UUID NOT NULL REFERENCES dsh_provider_ratings(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_provider_rating_receipt_key_chk CHECK (length(btrim(idempotency_key)) BETWEEN 16 AND 200),
    CONSTRAINT dsh_provider_rating_receipt_correlation_chk CHECK (length(btrim(correlation_id)) BETWEEN 1 AND 200),
    CONSTRAINT dsh_provider_rating_receipt_pair_chk CHECK (captain_rating_id <> order_rating_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_provider_rating_receipts_actor_key
    ON dsh_provider_rating_mutation_receipts (operator_context_id, actor_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_dsh_provider_rating_receipts_order
    ON dsh_provider_rating_mutation_receipts (operator_context_id, actor_id, order_id, created_at DESC);

COMMIT;
