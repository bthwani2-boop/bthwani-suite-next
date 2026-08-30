-- DSH-1066: make Captain delivery-status transitions one durable command.
-- The assignment and order rows remain the lifecycle truth; this table stores
-- only the command identity required for exact replay and collision detection.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_captain_delivery_status_command_receipts (
  operator_context_id text        NOT NULL,
  actor_id            text        NOT NULL,
  assignment_id       uuid        NOT NULL
    REFERENCES dsh_assignments(id) ON DELETE CASCADE,
  status              text        NOT NULL
    CHECK (status IN ('driver_arrived_store', 'picked_up', 'arrived_customer')),
  expected_version    integer     NOT NULL CHECK (expected_version > 0),
  idempotency_key     text        NOT NULL
    CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  request_fingerprint text        NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id      text        NOT NULL
    CHECK (char_length(btrim(correlation_id)) BETWEEN 8 AND 200),
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, idempotency_key),
  CHECK (char_length(btrim(operator_context_id)) > 0),
  CHECK (char_length(btrim(actor_id)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dsh_captain_delivery_status_receipts_assignment
  ON dsh_captain_delivery_status_command_receipts(operator_context_id, assignment_id, created_at DESC);

COMMIT;
