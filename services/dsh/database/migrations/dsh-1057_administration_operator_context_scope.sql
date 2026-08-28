-- DSH-1057: bind administration requests, intents, and audit readback to the
-- trusted OperatorContext carried by the DSH request.
-- Historical rows that cannot be mapped from DSH-owned data are quarantined
-- as legacy-unscoped. Runtime administration code never executes or returns
-- those rows as part of a live context.

BEGIN;

ALTER TABLE dsh_admin_approval_requests
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_admin_role_definition_requests
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_admin_rollback_requests
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE dsh_admin_audit
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

UPDATE dsh_admin_approval_requests
SET operator_context_id = COALESCE(NULLIF(btrim(current_setting('bthwani.legacy_operator_context', true)), ''), 'legacy-unscoped')
WHERE operator_context_id IS NULL;
UPDATE dsh_admin_role_definition_requests
SET operator_context_id = COALESCE(NULLIF(btrim(current_setting('bthwani.legacy_operator_context', true)), ''), 'legacy-unscoped')
WHERE operator_context_id IS NULL;
UPDATE dsh_admin_rollback_requests
SET operator_context_id = COALESCE(NULLIF(btrim(current_setting('bthwani.legacy_operator_context', true)), ''), 'legacy-unscoped')
WHERE operator_context_id IS NULL;
UPDATE dsh_admin_canonical_mutation_intents
SET operator_context_id = COALESCE(NULLIF(btrim(current_setting('bthwani.legacy_operator_context', true)), ''), 'legacy-unscoped')
WHERE operator_context_id IS NULL;
UPDATE dsh_admin_audit
SET operator_context_id = COALESCE(NULLIF(btrim(current_setting('bthwani.legacy_operator_context', true)), ''), 'legacy-unscoped')
WHERE operator_context_id IS NULL;

ALTER TABLE dsh_admin_approval_requests
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_admin_role_definition_requests
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_admin_rollback_requests
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_admin_canonical_mutation_intents
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_admin_audit
  ALTER COLUMN operator_context_id SET NOT NULL;

ALTER TABLE dsh_admin_approval_requests
  ADD CONSTRAINT dsh_admin_approval_operator_context_nonempty
  CHECK (btrim(operator_context_id) <> '');
ALTER TABLE dsh_admin_role_definition_requests
  ADD CONSTRAINT dsh_admin_role_definition_operator_context_nonempty
  CHECK (btrim(operator_context_id) <> '');
ALTER TABLE dsh_admin_rollback_requests
  ADD CONSTRAINT dsh_admin_rollback_operator_context_nonempty
  CHECK (btrim(operator_context_id) <> '');
ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD CONSTRAINT dsh_admin_intent_operator_context_nonempty
  CHECK (btrim(operator_context_id) <> '');

DROP INDEX IF EXISTS uq_dsh_admin_pending_role_change_by_actor_role;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_pending_role_change_by_context_actor_role
  ON dsh_admin_approval_requests (operator_context_id, target_actor_id, role_name)
  WHERE status = 'pending';

DROP INDEX IF EXISTS uq_dsh_admin_pending_role_definition;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_pending_role_definition_by_context
  ON dsh_admin_role_definition_requests (operator_context_id, lower(role_name))
  WHERE status = 'pending';

DROP INDEX IF EXISTS uq_dsh_admin_rollback_pending_source;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_rollback_pending_source_by_context
  ON dsh_admin_rollback_requests (operator_context_id, source_approval_id)
  WHERE status = 'pending';

ALTER TABLE dsh_admin_canonical_mutation_intents
  DROP CONSTRAINT IF EXISTS dsh_admin_canonical_mutation_intents_operation_type_request_id_key;
ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD CONSTRAINT dsh_admin_canonical_mutation_intents_context_operation_request_key
  UNIQUE (operator_context_id, operation_type, request_id);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_approval_context_status_created
  ON dsh_admin_approval_requests (operator_context_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_admin_role_definition_context_status_created
  ON dsh_admin_role_definition_requests (operator_context_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_admin_rollback_context_status_created
  ON dsh_admin_rollback_requests (operator_context_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_admin_intent_context_retry
  ON dsh_admin_canonical_mutation_intents (operator_context_id, next_attempt_at, created_at)
  WHERE status <> 'applied';

COMMENT ON COLUMN dsh_admin_approval_requests.operator_context_id IS
  'Trusted DSH request ownership scope; legacy-unscoped is migration quarantine only.';
COMMENT ON COLUMN dsh_admin_canonical_mutation_intents.operator_context_id IS
  'Persisted execution ownership scope; legacy-unscoped intents are not executable.';

COMMIT;
