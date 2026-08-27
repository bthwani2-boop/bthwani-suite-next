-- DSH-1042: canonical OperatorContext ownership for support-session workflow state.

BEGIN;

ALTER TABLE dsh_admin_support_session_requests
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_admin_audit
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

UPDATE dsh_admin_support_session_requests
SET operator_context_id = COALESCE(NULLIF(current_setting('bthwani.legacy_operator_context', true), ''), 'legacy-unscoped')
WHERE operator_context_id IS NULL;

UPDATE dsh_admin_audit AS a
SET operator_context_id = r.operator_context_id
FROM dsh_admin_support_session_requests AS r
WHERE a.operator_context_id IS NULL
  AND a.correlation_id = r.id::TEXT;

UPDATE dsh_admin_audit
SET operator_context_id = COALESCE(NULLIF(current_setting('bthwani.legacy_operator_context', true), ''), 'legacy-unscoped')
WHERE operator_context_id IS NULL;

ALTER TABLE dsh_admin_support_session_requests
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_admin_support_session_requests
  ADD CONSTRAINT dsh_support_request_operator_context_nonempty
  CHECK (btrim(operator_context_id) <> '');
ALTER TABLE dsh_admin_audit
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_admin_audit
  ADD CONSTRAINT dsh_admin_audit_operator_context_nonempty
  CHECK (btrim(operator_context_id) <> '');

DROP INDEX IF EXISTS uq_dsh_admin_active_support_target;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_active_support_target_context
  ON dsh_admin_support_session_requests (operator_context_id, target_actor_id)
  WHERE status IN ('pending','approved','issued');
CREATE INDEX IF NOT EXISTS idx_dsh_admin_support_context_status_created
  ON dsh_admin_support_session_requests (operator_context_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_admin_audit_context_correlation
  ON dsh_admin_audit (operator_context_id, correlation_id, created_at DESC);

COMMIT;
