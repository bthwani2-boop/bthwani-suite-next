-- DSH-1071: persist operator delivery-exception decision identity.
-- Resolve decisions are replayed by operator context + idempotency key. The
-- cancel-order decision can cross the orders transaction, so started is a
-- durable recovery state rather than an in-memory or shadow command record.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_delivery_exception_operation_command_receipts (
  operator_context_id     text NOT NULL,
  actor_id                text NOT NULL,
  exception_id            uuid NOT NULL REFERENCES dsh_delivery_exceptions(id) ON DELETE CASCADE,
  operation               text NOT NULL CHECK (operation IN ('acknowledge', 'resolve')),
  expected_version        integer NOT NULL CHECK (expected_version > 0),
  action                  text NOT NULL DEFAULT '',
  note                    text NOT NULL DEFAULT '',
  replacement_captain_id  text NOT NULL DEFAULT '',
  idempotency_key         text NOT NULL CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  request_fingerprint     text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id          text NOT NULL CHECK (char_length(btrim(correlation_id)) BETWEEN 8 AND 200),
  status                  text NOT NULL DEFAULT 'completed' CHECK (status IN ('started', 'completed')),
  resulting_version       integer CHECK (resulting_version IS NULL OR resulting_version > 0),
  created_at              timestamptz NOT NULL DEFAULT now(),
  completed_at            timestamptz,
  PRIMARY KEY (operator_context_id, idempotency_key),
  CHECK (char_length(btrim(operator_context_id)) > 0),
  CHECK (char_length(btrim(actor_id)) > 0),
  CHECK (operation <> 'acknowledge' OR action = ''),
  CHECK (operation <> 'resolve' OR (action <> '' AND char_length(btrim(note)) BETWEEN 5 AND 1000)),
  CHECK (status <> 'completed' OR resulting_version IS NOT NULL),
  CHECK (status <> 'started' OR completed_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exception_operation_receipts_entity
  ON dsh_delivery_exception_operation_command_receipts(operator_context_id, exception_id, created_at DESC);

COMMIT;
