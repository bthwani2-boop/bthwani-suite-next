-- WLT-093: atomic idempotency receipts for JRN-036 policy and lifecycle
-- mutations that do not already own a domain-specific idempotency table.
--
-- A transaction-level advisory lock is acquired by the backend before reading
-- this table. The mutation and its canonical response are committed together,
-- so a retry can return the original result without creating another policy
-- version or replaying a wallet/ledger transition.

BEGIN;

CREATE TABLE IF NOT EXISTS wlt_jrn036_mutation_receipts (
  idempotency_key text PRIMARY KEY,
  request_hash text NOT NULL,
  mutation_type text NOT NULL CHECK (btrim(mutation_type) <> ''),
  aggregate_id text NOT NULL CHECK (btrim(aggregate_id) <> ''),
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wlt_jrn036_mutation_receipts_aggregate_idx
  ON wlt_jrn036_mutation_receipts(mutation_type, aggregate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wlt_jrn036_mutation_receipts_request_hash_idx
  ON wlt_jrn036_mutation_receipts(request_hash);

COMMIT;
