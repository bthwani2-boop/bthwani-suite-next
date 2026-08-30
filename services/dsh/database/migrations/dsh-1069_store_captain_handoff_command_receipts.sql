-- DSH-1069: persist partner store-captain handoff command identity.
-- The handoff row remains canonical state; this receipt binds each command
-- to the exact handoff it advanced so retries cannot replay by state alone.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_store_captain_handoff_command_receipts (
  operator_context_id text NOT NULL,
  actor_id            text NOT NULL,
  order_id            uuid NOT NULL,
  store_id            text NOT NULL,
  idempotency_key     text NOT NULL CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id      text NOT NULL CHECK (char_length(btrim(correlation_id)) BETWEEN 8 AND 200),
  handoff_id          uuid NOT NULL REFERENCES dsh_store_captain_handoffs(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, idempotency_key),
  CHECK (char_length(btrim(operator_context_id)) > 0),
  CHECK (char_length(btrim(actor_id)) > 0),
  CHECK (char_length(btrim(store_id)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dsh_store_captain_handoff_receipts_entity
  ON dsh_store_captain_handoff_command_receipts(operator_context_id, order_id, store_id, created_at DESC);

COMMIT;
