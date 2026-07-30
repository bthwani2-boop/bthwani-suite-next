-- Repair development actors created by older bootstrap revisions that did not
-- update tenant_id during ON CONFLICT. This migration is forward-only and
-- preserves all sessions, roles, permissions, and audit history.

UPDATE identity_actors
SET tenant_id = 'local-dsh',
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
  AND btrim(tenant_id) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'identity_actors_tenant_nonblank_chk'
      AND conrelid = 'identity_actors'::regclass
  ) THEN
    ALTER TABLE identity_actors
      ADD CONSTRAINT identity_actors_tenant_nonblank_chk
      CHECK (btrim(tenant_id) <> '') NOT VALID;
  END IF;
END
$$;
