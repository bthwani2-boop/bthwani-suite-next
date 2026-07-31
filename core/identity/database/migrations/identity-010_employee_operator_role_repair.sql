-- Remove the broad DSH operator role from administrative employees that are
-- not the sovereign platform owner. Exact Identity permissions remain the
-- authority for coordinators, department managers and regular staff.
--
-- The platform owner is identified by the canonical, server-issued
-- workforce leadership:create permission scoped to all. No user-supplied
-- label, username or role ordering is trusted by this repair.
UPDATE identity_actors
SET roles = array_remove(roles, 'operator'),
    updated_at = now()
WHERE 'employee' = ANY(roles)
  AND 'operator' = ANY(roles)
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(permissions) AS permission
    WHERE permission->>'service' = 'workforce'
      AND permission->>'surface' = 'control-panel'
      AND permission->>'action' = 'leadership:create'
      AND permission->>'scope' = 'all'
  );

-- The repair is idempotent and must leave no non-owner employee with the
-- broad operator role.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE 'employee' = ANY(roles)
      AND 'operator' = ANY(roles)
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(permissions) AS permission
        WHERE permission->>'service' = 'workforce'
          AND permission->>'surface' = 'control-panel'
          AND permission->>'action' = 'leadership:create'
          AND permission->>'scope' = 'all'
      )
  ) THEN
    RAISE EXCEPTION 'non-owner employee still has operator role';
  END IF;
END
$$;
