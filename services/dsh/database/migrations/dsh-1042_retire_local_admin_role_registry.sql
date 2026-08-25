-- dsh-1042_retire_local_admin_role_registry.sql
--
-- Identity is the sole owner of role vocabulary, role definitions, and
-- actor-role assignments. DSH keeps only governed maker/checker workflow
-- history keyed by canonical role_name. The legacy dsh_admin_roles registry
-- and its UUID linkage are therefore no longer valid runtime or historical
-- authority.
--
-- Deliberately omit CASCADE everywhere. Any undiscovered consumer must block
-- this cutover instead of being deleted silently.

BEGIN;

DO $$
DECLARE
  approval_unresolved bigint;
  rollback_unresolved bigint;
BEGIN
  SELECT count(*)
  INTO approval_unresolved
  FROM dsh_admin_approval_requests
  WHERE role_name IS NULL OR btrim(role_name) = '';

  IF approval_unresolved <> 0 THEN
    RAISE EXCEPTION
      'cannot retire dsh_admin_roles: % approval history rows lack canonical role_name',
      approval_unresolved
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*)
  INTO rollback_unresolved
  FROM dsh_admin_rollback_requests
  WHERE role_name IS NULL OR btrim(role_name) = '';

  IF rollback_unresolved <> 0 THEN
    RAISE EXCEPTION
      'cannot retire dsh_admin_roles: % rollback history rows lack canonical role_name',
      rollback_unresolved
      USING ERRCODE = '23514';
  END IF;
END;
$$;

-- These columns are obsolete UUID links to DSH-owned role truth. Dropping the
-- columns removes only their own local constraints/index dependencies. Any
-- external dependency blocks because CASCADE is intentionally absent.
ALTER TABLE dsh_admin_approval_requests
  DROP COLUMN role_id;

ALTER TABLE dsh_admin_rollback_requests
  DROP COLUMN role_id;

-- The registry itself must now be unreachable. Any undiscovered FK/view or
-- other database consumer prevents this statement from succeeding.
DROP TABLE dsh_admin_roles;

DO $$
BEGIN
  IF to_regclass('public.dsh_admin_roles') IS NOT NULL THEN
    RAISE EXCEPTION 'dsh_admin_roles remains after canonical cutover'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'dsh_admin_approval_requests',
        'dsh_admin_rollback_requests'
      )
      AND column_name = 'role_id'
  ) THEN
    RAISE EXCEPTION 'legacy DSH role_id linkage remains after canonical cutover'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM dsh_admin_approval_requests
    WHERE role_name IS NULL OR btrim(role_name) = ''
  ) OR EXISTS (
    SELECT 1
    FROM dsh_admin_rollback_requests
    WHERE role_name IS NULL OR btrim(role_name) = ''
  ) THEN
    RAISE EXCEPTION 'canonical DSH administration role_name history is incomplete'
      USING ERRCODE = '23514';
  END IF;
END;
$$;

COMMIT;
