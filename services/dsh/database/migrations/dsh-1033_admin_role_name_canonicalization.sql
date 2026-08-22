-- dsh-1033_admin_role_name_canonicalization.sql
--
-- Cut governed administration request history away from DSH-owned role UUIDs.
-- Identity owns the role vocabulary, definitions and actor-role assignments.
-- DSH retains only maker/checker and rollback history, keyed by canonical role name.
--
-- role_id remains nullable temporarily only to preserve historical linkage until
-- all runtime consumers have moved to role_name and the obsolete dsh_admin_roles
-- table can be removed in a later zero-consumer cutover.

ALTER TABLE dsh_admin_approval_requests
  ADD COLUMN IF NOT EXISTS role_name TEXT;

UPDATE dsh_admin_approval_requests approval
SET role_name = role.name
FROM dsh_admin_roles role
WHERE approval.role_name IS NULL
  AND approval.role_id = role.id;

DO $$
DECLARE
  unresolved_count bigint;
BEGIN
  SELECT count(*)
  INTO unresolved_count
  FROM dsh_admin_approval_requests
  WHERE role_name IS NULL OR btrim(role_name) = '';

  IF unresolved_count <> 0 THEN
    RAISE EXCEPTION 'cannot canonicalize admin approval role references: % unresolved rows', unresolved_count;
  END IF;
END
$$;

ALTER TABLE dsh_admin_approval_requests
  ALTER COLUMN role_name SET NOT NULL,
  ALTER COLUMN role_id DROP NOT NULL;

ALTER TABLE dsh_admin_approval_requests
  DROP CONSTRAINT IF EXISTS dsh_admin_approval_requests_role_name_nonempty;
ALTER TABLE dsh_admin_approval_requests
  ADD CONSTRAINT dsh_admin_approval_requests_role_name_nonempty
  CHECK (btrim(role_name) <> '');

DROP INDEX IF EXISTS uq_dsh_admin_pending_role_assignment;
DROP INDEX IF EXISTS uq_dsh_admin_pending_role_change;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_pending_role_change_by_name
  ON dsh_admin_approval_requests (action_type, target_actor_id, role_name)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_admin_approval_role_name
  ON dsh_admin_approval_requests (role_name, created_at DESC);

ALTER TABLE dsh_admin_rollback_requests
  ADD COLUMN IF NOT EXISTS role_name TEXT;

UPDATE dsh_admin_rollback_requests rollback_request
SET role_name = COALESCE(source.role_name, role.name)
FROM dsh_admin_approval_requests source
LEFT JOIN dsh_admin_roles role ON role.id = rollback_request.role_id
WHERE rollback_request.source_approval_id = source.id
  AND rollback_request.role_name IS NULL;

DO $$
DECLARE
  unresolved_count bigint;
  mismatch_count bigint;
BEGIN
  SELECT count(*)
  INTO unresolved_count
  FROM dsh_admin_rollback_requests
  WHERE role_name IS NULL OR btrim(role_name) = '';

  IF unresolved_count <> 0 THEN
    RAISE EXCEPTION 'cannot canonicalize admin rollback role references: % unresolved rows', unresolved_count;
  END IF;

  SELECT count(*)
  INTO mismatch_count
  FROM dsh_admin_rollback_requests rollback_request
  JOIN dsh_admin_approval_requests source
    ON source.id = rollback_request.source_approval_id
  WHERE rollback_request.role_name <> source.role_name;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION 'admin rollback/source role-name mismatch: % rows', mismatch_count;
  END IF;
END
$$;

ALTER TABLE dsh_admin_rollback_requests
  ALTER COLUMN role_name SET NOT NULL,
  ALTER COLUMN role_id DROP NOT NULL;

ALTER TABLE dsh_admin_rollback_requests
  DROP CONSTRAINT IF EXISTS dsh_admin_rollback_requests_role_name_nonempty;
ALTER TABLE dsh_admin_rollback_requests
  ADD CONSTRAINT dsh_admin_rollback_requests_role_name_nonempty
  CHECK (btrim(role_name) <> '');

CREATE INDEX IF NOT EXISTS idx_dsh_admin_rollback_role_name
  ON dsh_admin_rollback_requests (role_name, created_at DESC);

-- Historical rows must preserve the exact name that was in effect at the time
-- of the governed request. New runtime writers use role_name directly and leave
-- role_id null, preventing new dependency on the obsolete DSH role registry.
