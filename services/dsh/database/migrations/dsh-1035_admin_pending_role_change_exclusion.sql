-- dsh-1035_admin_pending_role_change_exclusion.sql
-- Only one pending role change may exist for an actor/role pair. This makes
-- assignment and revocation mutually exclusive even when requests race.

BEGIN;

DO $$
DECLARE
  conflict_count bigint;
BEGIN
  SELECT count(*)
  INTO conflict_count
  FROM (
    SELECT target_actor_id, role_name
    FROM dsh_admin_approval_requests
    WHERE status = 'pending'
    GROUP BY target_actor_id, role_name
    HAVING count(*) > 1
  ) conflicts;

  IF conflict_count <> 0 THEN
    RAISE EXCEPTION 'cannot enforce mutually exclusive pending role changes: % conflicting actor/role pairs', conflict_count;
  END IF;
END
$$;

DROP INDEX IF EXISTS uq_dsh_admin_pending_role_change_by_name;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_pending_role_change_by_actor_role
  ON dsh_admin_approval_requests (target_actor_id, role_name)
  WHERE status = 'pending';

COMMIT;
