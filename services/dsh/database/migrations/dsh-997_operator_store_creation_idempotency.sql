-- dsh-997_operator_store_creation_idempotency.sql
--
-- Governed operator store creation is idempotent inside an OperatorContext.
-- The shared dsh_store_idempotency ledger remains authoritative for mutations
-- of already-known stores. Using that actor/operation-scoped ledger for branch
-- creation makes the same actor/key collide across independent contexts.
--
-- This dedicated retry ledger makes OperatorContext ownership part of the
-- durable creation identity without changing existing store-mutation semantics.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_operator_store_creation_idempotency (
  operator_context_id TEXT        NOT NULL CHECK (btrim(operator_context_id) <> ''),
  actor_id            TEXT        NOT NULL CHECK (btrim(actor_id) <> ''),
  idempotency_key     TEXT        NOT NULL CHECK (btrim(idempotency_key) <> ''),
  request_hash        TEXT        NOT NULL CHECK (btrim(request_hash) <> ''),
  response_body       JSONB       NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  PRIMARY KEY (operator_context_id, actor_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_operator_store_creation_idempotency_expiry
  ON dsh_operator_store_creation_idempotency
     (expires_at, operator_context_id, actor_id);

COMMIT;
