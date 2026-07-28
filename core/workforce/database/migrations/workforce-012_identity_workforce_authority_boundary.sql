-- Workforce-012: enforce the Identity/Workforce authority boundary.
--
-- Workforce no longer stores a second editable authority projection. Identity
-- is the sole owner of roles, bundle expansion and effective permissions.
-- Workforce keeps only the bundle identifier on the dated organisational
-- assignment as an immutable cross-context reference.

ALTER TABLE workforce_employee_governance
  DROP COLUMN IF EXISTS authority_scopes;

-- PostgreSQL truncates automatically generated constraint names to 63 bytes.
-- Discover the legacy enum CHECK by its definition instead of assuming its
-- generated name, then replace it with a stable format-only boundary.
DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT constraint.conname
    FROM pg_constraint constraint
    WHERE constraint.conrelid = 'workforce_sovereign_leadership_assignments'::regclass
      AND constraint.contype = 'c'
      AND pg_get_constraintdef(constraint.oid) ILIKE '%permission_bundle%'
  LOOP
    EXECUTE format(
      'ALTER TABLE workforce_sovereign_leadership_assignments DROP CONSTRAINT %I',
      constraint_row.conname
    );
  END LOOP;
END $$;

ALTER TABLE workforce_sovereign_leadership_assignments
  ADD CONSTRAINT workforce_sovereign_leadership_permission_bundle_format_chk
  CHECK (permission_bundle ~ '^[a-z0-9][a-z0-9_-]{1,63}$');

COMMENT ON COLUMN workforce_sovereign_leadership_assignments.permission_bundle IS
  'Identity-owned permission-bundle identifier referenced by Workforce; Workforce must not expand or reinterpret it.';

COMMENT ON TABLE workforce_employee_governance IS
  'Reviewed organisational position, guarantee, responsibility and managed departments; effective authority is owned exclusively by Identity.';
