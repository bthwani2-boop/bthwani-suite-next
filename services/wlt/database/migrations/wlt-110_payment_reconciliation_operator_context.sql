-- WLT-110: OperatorContext-local payment reconciliation workflow.
--
-- Reconciliation cases are derived from WLT-owned payment sessions. Carry the
-- session OperatorContext into the case so list/read/assign/resolve operations and the
-- single-open-case identity cannot cross OperatorContext boundaries.

BEGIN;

ALTER TABLE wlt_reconciliation_cases
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_reconciliation_cases reconciliation
SET operator_context_id = session.operator_context_id
FROM wlt_payment_sessions session
WHERE reconciliation.payment_session_id = session.id
  AND (reconciliation.operator_context_id IS NULL OR btrim(reconciliation.operator_context_id) = '');

UPDATE wlt_reconciliation_cases
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_reconciliation_cases
  ALTER COLUMN operator_context_id SET NOT NULL;

DROP INDEX IF EXISTS wlt_reconciliation_cases_session_idx;
DROP INDEX IF EXISTS wlt_reconciliation_cases_open_idx;
DROP INDEX IF EXISTS wlt_reconciliation_cases_open_unique_idx;

CREATE INDEX wlt_reconciliation_cases_OperatorContext_session_idx
  ON wlt_reconciliation_cases (operator_context_id, payment_session_id, created_at DESC);
CREATE INDEX wlt_reconciliation_cases_OperatorContext_status_idx
  ON wlt_reconciliation_cases (operator_context_id, status, created_at DESC);
CREATE UNIQUE INDEX wlt_reconciliation_cases_OperatorContext_open_uq
  ON wlt_reconciliation_cases (operator_context_id, payment_session_id, operation)
  WHERE status = 'open';

COMMENT ON COLUMN wlt_reconciliation_cases.operator_context_id IS
  'OperatorContext copied from the authoritative WLT payment session; active runtime never falls back to legacy-unscoped.';

COMMIT;
