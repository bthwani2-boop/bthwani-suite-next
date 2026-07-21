-- DSH-901: make checkout creation idempotent across client retries and process restarts.
-- The authenticated tenant/client context owns the key; clients cannot reuse a
-- key for a different request fingerprint. The WLT session remains owned by WLT.

CREATE TABLE IF NOT EXISTS dsh_checkout_create_idempotency (
    tenant_id          TEXT        NOT NULL,
    client_id          TEXT        NOT NULL,
    idempotency_key    TEXT        NOT NULL,
    request_fingerprint TEXT       NOT NULL,
    checkout_intent_id UUID        NOT NULL REFERENCES dsh_checkout_intents(id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, client_id, idempotency_key),
    CONSTRAINT dsh_checkout_create_idempotency_tenant_chk
        CHECK (btrim(tenant_id) <> ''),
    CONSTRAINT dsh_checkout_create_idempotency_client_chk
        CHECK (btrim(client_id) <> ''),
    CONSTRAINT dsh_checkout_create_idempotency_key_chk
        CHECK (char_length(idempotency_key) BETWEEN 16 AND 200),
    CONSTRAINT dsh_checkout_create_idempotency_fingerprint_chk
        CHECK (char_length(request_fingerprint) = 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_checkout_create_idempotency_intent
    ON dsh_checkout_create_idempotency(checkout_intent_id);

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_create_idempotency_created_at
    ON dsh_checkout_create_idempotency(created_at DESC);
