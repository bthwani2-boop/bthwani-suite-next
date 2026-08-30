-- DSH-1063: bind client profile preference and consent writes to durable commands.
-- The profile row remains canonical; receipts only make ambiguous retries replay-safe.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_client_profile_mutation_receipts (
  client_id          TEXT        NOT NULL,
  idempotency_key    TEXT        NOT NULL
    CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  operation          TEXT        NOT NULL
    CHECK (operation IN ('preferences', 'consents')),
  request_fingerprint TEXT      NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id     TEXT        NOT NULL
    CHECK (char_length(btrim(correlation_id)) BETWEEN 8 AND 200),
  result_version     INTEGER     NOT NULL CHECK (result_version >= 1),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_client_profile_receipts_client
  ON dsh_client_profile_mutation_receipts (client_id, created_at DESC);

COMMIT;
