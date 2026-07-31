-- Repair development actors created by older bootstrap revisions that did not
-- update operator_context_id during ON CONFLICT. This migration is forward-only and
-- preserves all sessions, roles, permissions, and audit history.

UPDATE identity_actors
SET operator_context_id = 'local-dsh',
    updated_at = now()
WHERE id = ANY (ARRAY[
  'operator-local-001',
  'partner-local-001',
  'field-local-001',
  'captain-local-001',
  'client-local-001',
  'platform-approver-local-001',
  'platform-applier-local-001',
  'platform-rollout-manager-local-001'
]::text[])
  AND btrim(operator_context_id) = '';

DO $$
BEGIN
  -- PostgreSQL folds unquoted constraint identifiers to lowercase. The prior
  -- mixed-case pg_constraint lookup did not see the already-created constraint,
  -- so a migration rerun attempted to add it again and failed.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'identity_actors_operatorcontext_nonblank_chk'
      AND conrelid = 'identity_actors'::regclass
  ) THEN
    ALTER TABLE identity_actors
      ADD CONSTRAINT identity_actors_operatorcontext_nonblank_chk
      CHECK (btrim(operator_context_id) <> '') NOT VALID;
  END IF;
END
$$;
