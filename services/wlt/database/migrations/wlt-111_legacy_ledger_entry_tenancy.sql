-- WLT-111: tenant-local identity for the legacy single-entry ledger read model.
--
-- The double-entry kernel is tenant-scoped by WLT-105. This older audit/read
-- model remains a registered API surface, so its optional idempotency identity
-- must also be local to the trusted tenant rather than globally coupling two
-- tenants that reuse the same business key.

BEGIN;

DROP INDEX IF EXISTS wlt_ledger_idempotency_idx;
CREATE UNIQUE INDEX wlt_ledger_entries_tenant_idempotency_uq
  ON wlt_ledger_entries (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX wlt_ledger_entries_tenant_created_idx
  ON wlt_ledger_entries (tenant_id, created_at DESC, id DESC);

COMMENT ON INDEX wlt_ledger_entries_tenant_idempotency_uq IS
  'Idempotency keys are authoritative only inside one trusted tenant.';

COMMIT;
