-- DSH-1049: durable actor-scoped idempotency for operator delivery-proof reviews.
-- The receipt is written in the same transaction as the review transition so a
-- lost response can be replayed without applying the operational decision twice.
CREATE TABLE IF NOT EXISTS dsh_delivery_proof_review_receipts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_id            UUID NOT NULL REFERENCES dsh_delivery_proofs(id) ON DELETE CASCADE,
    operator_id         TEXT NOT NULL,
    idempotency_key     TEXT NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 240),
    request_fingerprint TEXT NOT NULL CHECK (length(request_fingerprint) = 64),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_proof_review_receipts_proof
    ON dsh_delivery_proof_review_receipts(proof_id, created_at DESC);

COMMENT ON TABLE dsh_delivery_proof_review_receipts IS
    'Durable actor-scoped command receipts for replay-safe operator delivery-proof reviews.';
