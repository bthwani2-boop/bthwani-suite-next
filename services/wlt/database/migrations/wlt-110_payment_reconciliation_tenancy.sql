-- WLT-110: tenant-local payment reconciliation workflow.
--
-- Reconciliation cases are derived from WLT-owned payment sessions. Carry the
-- session tenant into the case so list/read/assign/resolve operations and the
-- single-open-case identity cannot cross tenant boundaries.

BEGIN;

ALTER TABLE wlt_reconciliation_cases
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_reconciliation_cases reconciliation
SET tenant_id = session.tenant_id
FROM wlt_payment_sessions session
WHERE reconciliation.payment_session_id = session.id
  AND (reconciliation.tenant_id IS NULL OR btrim(reconciliation.tenant_id) = '');

UPDATE wlt_reconciliation_cases
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_reconciliation_cases
  ALTER COLUMN tenant_id SET NOT NULL;

DROP INDEX IF EXISTS wlt_reconciliation_cases_session_idx;
DROP INDEX IF EXISTS wlt_reconciliation_cases_open_idx;
DROP INDEX IF EXISTS wlt_reconciliation_cases_open_unique_idx;

CREATE INDEX wlt_reconciliation_cases_tenant_session_idx
  ON wlt_reconciliation_cases (tenant_id, payment_session_id, created_at DESC);
CREATE INDEX wlt_reconciliation_cases_tenant_status_idx
  ON wlt_reconciliation_cases (tenant_id, status, created_at DESC);
CREATE UNIQUE INDEX wlt_reconciliation_cases_tenant_open_uq
  ON wlt_reconciliation_cases (tenant_id, payment_session_id, operation)
  WHERE status = 'open';

COMMENT ON COLUMN wlt_reconciliation_cases.tenant_id IS
  'Tenant copied from the authoritative WLT payment session; active runtime never falls back to legacy-unscoped.';

COMMIT;
