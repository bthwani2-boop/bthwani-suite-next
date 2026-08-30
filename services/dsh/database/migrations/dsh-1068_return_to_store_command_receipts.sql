-- DSH-1068: persist Captain and Partner return-to-store command identities.
-- The lifecycle rows remain canonical state; this receipt binds each command
-- to the exact exception it advanced so retries cannot replay by state alone.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_return_to_store_command_receipts (
  operator_context_id text NOT NULL,
  actor_id            text NOT NULL,
  command             text NOT NULL CHECK (command IN ('captain_arrive', 'partner_accept')),
  entity_id           text NOT NULL CHECK (char_length(btrim(entity_id)) > 0),
  idempotency_key     text NOT NULL CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id      text NOT NULL CHECK (char_length(btrim(correlation_id)) BETWEEN 8 AND 200),
  exception_id        uuid NOT NULL REFERENCES dsh_delivery_exceptions(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, idempotency_key),
  CHECK (char_length(btrim(operator_context_id)) > 0),
  CHECK (char_length(btrim(actor_id)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dsh_return_to_store_receipts_entity
  ON dsh_return_to_store_command_receipts(operator_context_id, entity_id, created_at DESC);

COMMIT;
