-- DSH-1064: make Captain accept/decline decisions one durable command.
-- The assignment and delivery rows remain the operational truth; this table
-- records only command identity for replay and collision protection.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_captain_assignment_command_receipts (
  operator_context_id text        NOT NULL,
  actor_id            text        NOT NULL,
  assignment_id       uuid        NOT NULL,
  operation           text        NOT NULL CHECK (operation IN ('accept', 'decline')),
  idempotency_key     text        NOT NULL
    CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  request_fingerprint text        NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id      text        NOT NULL
    CHECK (char_length(btrim(correlation_id)) BETWEEN 8 AND 200),
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, actor_id, idempotency_key),
  FOREIGN KEY (assignment_id) REFERENCES dsh_assignments(id) ON DELETE CASCADE,
  CHECK (char_length(btrim(operator_context_id)) > 0),
  CHECK (char_length(btrim(actor_id)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dsh_captain_assignment_receipts_assignment
  ON dsh_captain_assignment_command_receipts(operator_context_id, assignment_id, created_at DESC);

COMMIT;
