-- DSH-1065: make a client information response one replay-safe command.
-- The information exchange and request remain canonical; this receipt binds
-- ambiguous retries to the already committed response.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_special_request_information_response_receipts (
  operator_context_id TEXT        NOT NULL,
  client_id           TEXT        NOT NULL,
  special_request_id  UUID        NOT NULL REFERENCES dsh_special_requests(id) ON DELETE CASCADE,
  idempotency_key     TEXT        NOT NULL
    CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  request_fingerprint TEXT        NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id      TEXT        NOT NULL
    CHECK (char_length(btrim(correlation_id)) BETWEEN 8 AND 200),
  exchange_id         UUID        NOT NULL REFERENCES dsh_special_request_information_exchanges(id) ON DELETE CASCADE,
  result_version      INTEGER     NOT NULL CHECK (result_version > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (operator_context_id, client_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_special_request_information_response_receipts_request
  ON dsh_special_request_information_response_receipts (operator_context_id, special_request_id, created_at DESC);

COMMIT;
