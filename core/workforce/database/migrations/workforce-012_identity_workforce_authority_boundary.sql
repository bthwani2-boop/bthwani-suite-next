-- Workforce-012: enforce the Identity/Workforce authority boundary.
--
-- Workforce no longer stores a second editable authority projection. Identity
-- is the sole owner of roles, bundle expansion and effective permissions.
-- Workforce keeps only the bundle identifier on the dated organisational
-- assignment as an immutable cross-context reference.

ALTER TABLE workforce_employee_governance
  DROP COLUMN IF EXISTS authority_scopes;

ALTER TABLE workforce_sovereign_leadership_assignments
  DROP CONSTRAINT IF EXISTS workforce_sovereign_leadership_assignments_permission_bundle_check;

ALTER TABLE workforce_sovereign_leadership_assignments
  DROP CONSTRAINT IF EXISTS workforce_sovereign_leadership_permission_bundle_format_chk;

ALTER TABLE workforce_sovereign_leadership_assignments
  ADD CONSTRAINT workforce_sovereign_leadership_permission_bundle_format_chk
  CHECK (permission_bundle ~ '^[a-z0-9][a-z0-9_-]{1,63}$');

COMMENT ON COLUMN workforce_sovereign_leadership_assignments.permission_bundle IS
  'Identity-owned permission-bundle identifier referenced by Workforce; Workforce must not expand or reinterpret it.';

COMMENT ON TABLE workforce_employee_governance IS
  'Reviewed organisational position, guarantee, responsibility and managed departments; effective authority is owned exclusively by Identity.';
