-- Workforce-027: atomic audit governance with idempotency and operator context integrity.
-- Ensures every privileged material mutation has durable audit evidence in the same transaction.
-- Adds idempotency key to workforce_action_audit to prevent duplicate audit records on retry.

-- 1. Ensure operator_context_id exists and is NOT NULL on workforce_action_audit
ALTER TABLE workforce_action_audit
ADD COLUMN IF NOT EXISTS operator_context_id text;

-- Backfill any NULL operator_context_id from workforce_people
UPDATE workforce_action_audit audit
SET operator_context_id = person.operator_context_id
FROM workforce_people person
WHERE audit.operator_context_id IS NULL
  AND person.actor_id = COALESCE(NULLIF(audit.target_actor_id, ''), audit.actor_id);

-- Make operator_context_id NOT NULL
ALTER TABLE workforce_action_audit
ALTER COLUMN operator_context_id SET NOT NULL;

-- 2. Add operation column to distinguish audit operations for idempotency
ALTER TABLE workforce_action_audit
ADD COLUMN IF NOT EXISTS operation text NOT NULL DEFAULT 'unknown';

-- 3. Add idempotency key column (correlation_id + operation + actor_id uniquely identifies an audit intent)
ALTER TABLE workforce_action_audit
ADD COLUMN IF NOT EXISTS idempotency_key text;

-- 4. Enforce audit idempotency only where the originating command supplied a
-- stable key. Historical rows must remain append-only evidence and cannot be
-- collapsed merely because older writers reused a correlation id.
CREATE UNIQUE INDEX IF NOT EXISTS workforce_action_audit_idempotency_uidx
ON workforce_action_audit (operator_context_id, actor_id, operation, idempotency_key)
WHERE idempotency_key IS NOT NULL AND BTRIM(idempotency_key) <> '';

-- 5. Add constraint to ensure correlation_id is provided for material mutations
-- (Read-only operations may not have correlation_id)
ALTER TABLE workforce_action_audit
ADD CONSTRAINT workforce_action_audit_material_mutation_chk
CHECK (
  correlation_id IS NOT NULL AND correlation_id <> ''
  OR action IN (
    'provider.document_linked',
    'field_agent.self_updated'
  )
) NOT VALID;

-- 6. Add index for efficient audit queries by operator context
CREATE INDEX IF NOT EXISTS workforce_action_audit_operator_context_idx
ON workforce_action_audit (operator_context_id, created_at DESC);

-- 7. Validate existing data
DO $$
BEGIN
  -- Ensure all existing rows have operator_context_id
  IF EXISTS (SELECT 1 FROM workforce_action_audit WHERE operator_context_id IS NULL OR BTRIM(operator_context_id) = '') THEN
    RAISE EXCEPTION 'workforce_action_audit has rows with missing operator_context_id after backfill';
  END IF;
END
$$;

COMMENT ON TABLE workforce_action_audit IS
  'Append-only audit trail for all privileged Workforce mutations. Each record is idempotent per (correlation_id, operation, actor_id, operator_context_id). State commit and audit insert are transactionally atomic.';

COMMENT ON COLUMN workforce_action_audit.operator_context_id IS
  'Authoritative operator context that authorized this mutation. Never NULL.';
COMMENT ON COLUMN workforce_action_audit.operation IS
  'Canonical operation name (e.g., create_field_agent, suspend, promote_captain_to_basic). Used for idempotency.';
COMMENT ON COLUMN workforce_action_audit.idempotency_key IS
  'Client-supplied idempotency key from the command request. Combined with correlation_id for audit deduplication.';
COMMENT ON COLUMN workforce_action_audit.correlation_id IS
  'Request correlation ID linking all audit records from a single client command.';
