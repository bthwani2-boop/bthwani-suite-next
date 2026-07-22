-- dsh-907_jrn_005_address_mutation_receipts.sql
-- Durable, PII-free receipts for update, delete and set-default retries.
-- The receipt is written in the same transaction as the address mutation so a
-- lost HTTP response can be retried without applying the side effect twice.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_client_address_mutation_receipts (
    client_id           TEXT        NOT NULL,
    idempotency_key     TEXT        NOT NULL CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
    operation           TEXT        NOT NULL CHECK (operation IN ('update', 'delete', 'set_default')),
    request_fingerprint TEXT        NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
    address_id          TEXT        NOT NULL,
    result_version      INTEGER     CHECK (result_version IS NULL OR result_version >= 1),
    result_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
    correlation_id      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (client_id, idempotency_key),
    CONSTRAINT dsh_client_address_mutation_receipts_delete_shape
      CHECK (
        (operation = 'delete' AND result_deleted = TRUE)
        OR
        (operation <> 'delete' AND result_deleted = FALSE AND result_version IS NOT NULL)
      )
);

CREATE INDEX IF NOT EXISTS idx_dsh_client_address_mutation_receipts_address
  ON dsh_client_address_mutation_receipts(client_id, address_id, created_at DESC);

COMMENT ON TABLE dsh_client_address_mutation_receipts IS
  'PII-free same-transaction idempotency receipts for JRN-005 address mutations.';

COMMIT;
