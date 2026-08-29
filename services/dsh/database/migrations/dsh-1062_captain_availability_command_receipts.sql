-- DSH-1062: make Captain availability changes one durable, replay-safe command.
-- The dispatch profile remains the operational truth; this table only records
-- the command identity needed to prevent duplicate transitions and collisions.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_captain_availability_command_receipts (
  operator_context_id text        NOT NULL,
  actor_id            text        NOT NULL,
  captain_id          text        NOT NULL,
  idempotency_key     text        NOT NULL
    CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  request_fingerprint text        NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id      text        NOT NULL
    CHECK (char_length(btrim(correlation_id)) BETWEEN 8 AND 200),
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, actor_id, idempotency_key),
  FOREIGN KEY (operator_context_id, captain_id)
    REFERENCES dsh_captain_dispatch_profiles(operator_context_id, captain_id)
    ON DELETE CASCADE,
  CHECK (char_length(btrim(operator_context_id)) > 0),
  CHECK (char_length(btrim(actor_id)) > 0),
  CHECK (char_length(btrim(captain_id)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dsh_captain_availability_receipts_captain
  ON dsh_captain_availability_command_receipts(operator_context_id, captain_id, created_at DESC);

COMMIT;
