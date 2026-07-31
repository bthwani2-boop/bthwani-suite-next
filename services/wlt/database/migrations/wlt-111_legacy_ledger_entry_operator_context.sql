-- WLT-111: OperatorContext-local identity for the legacy single-entry ledger read model.
--
-- The double-entry kernel is OperatorContext-scoped by WLT-105. This older audit/read
-- model remains a registered API surface, so its optional idempotency identity
-- must also be local to the trusted OperatorContext rather than globally coupling two
-- OperatorContexts that reuse the same business key.

BEGIN;

DROP INDEX IF EXISTS wlt_ledger_idempotency_idx;
CREATE UNIQUE INDEX IF NOT EXISTS wlt_ledger_entries_operator_context_idempotency_uq
  ON wlt_ledger_entries (operator_context_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_ledger_entries_OperatorContext_created_idx
  ON wlt_ledger_entries (operator_context_id, created_at DESC, id DESC);

COMMENT ON INDEX wlt_ledger_entries_operator_context_idempotency_uq IS
  'Idempotency keys are authoritative only inside one trusted OperatorContext.';

COMMIT;
