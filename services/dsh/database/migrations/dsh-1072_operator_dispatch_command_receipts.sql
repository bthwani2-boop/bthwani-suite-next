-- DSH-1072: persist operator assignment cancellation/expiry command identity.
-- Assignment creation/reassignment retain their canonical assignment key;
-- this receipt closes the remaining operator commands transactionally.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_operator_dispatch_command_receipts (
  operator_context_id  text NOT NULL,
  actor_id             text NOT NULL,
  operation            text NOT NULL CHECK (operation IN ('cancel_assignment', 'expire_assignments')),
  assignment_id        uuid,
  reason_code          text NOT NULL DEFAULT '',
  reason               text NOT NULL DEFAULT '',
  limit_value          integer NOT NULL DEFAULT 0 CHECK (limit_value BETWEEN 0 AND 500),
  idempotency_key      text NOT NULL CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  request_fingerprint  text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  correlation_id       text NOT NULL CHECK (char_length(btrim(correlation_id)) BETWEEN 8 AND 200),
  result_count         integer NOT NULL CHECK (result_count >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, idempotency_key),
  CHECK (char_length(btrim(operator_context_id)) > 0),
  CHECK (char_length(btrim(actor_id)) > 0),
  CHECK (operation <> 'cancel_assignment' OR (assignment_id IS NOT NULL AND reason_code <> '' AND reason <> '' AND limit_value = 0)),
  CHECK (operation <> 'expire_assignments' OR (assignment_id IS NULL AND reason_code = '' AND reason = '' AND limit_value BETWEEN 1 AND 500))
);

CREATE INDEX IF NOT EXISTS idx_dsh_operator_dispatch_command_receipts_assignment
  ON dsh_operator_dispatch_command_receipts(operator_context_id, assignment_id, created_at DESC);

COMMIT;
