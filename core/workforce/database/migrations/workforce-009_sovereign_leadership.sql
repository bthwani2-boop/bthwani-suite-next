-- Workforce-009: sovereign leadership assignments and effective authority package.
-- Identity owns effective permissions; Workforce owns the reviewed organisational
-- assignment, department scope and assignment validity window.

CREATE TABLE IF NOT EXISTS workforce_sovereign_leadership_assignments (
  actor_id             text PRIMARY KEY REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  permission_bundle    text NOT NULL CHECK (permission_bundle IN (
    'platform_owner',
    'platform_coordinator',
    'operations_manager',
    'partners_manager',
    'finance_manager',
    'support_manager',
    'hr_manager'
  )),
  department_scope     text NOT NULL,
  starts_on            date NOT NULL DEFAULT current_date,
  ends_on              date,
  assignment_status    text NOT NULL DEFAULT 'active' CHECK (assignment_status IN ('active','suspended','expired','ended')),
  created_by_actor_id  text NOT NULL,
  updated_by_actor_id  text NOT NULL,
  version               integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS workforce_sovereign_leadership_active_idx
  ON workforce_sovereign_leadership_assignments(department_scope, assignment_status, starts_on, ends_on);
