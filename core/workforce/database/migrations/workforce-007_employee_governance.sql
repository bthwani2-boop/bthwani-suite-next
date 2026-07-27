-- Workforce-007: governed employee position, guarantee and responsibility scope.
-- Identity remains the authentication/permission owner. Workforce stores the
-- administrative assignment and the reviewed scope used by the control panel.

CREATE TABLE IF NOT EXISTS workforce_employee_governance (
  actor_id                    text PRIMARY KEY REFERENCES workforce_employee_profiles(actor_id) ON DELETE CASCADE,
  position_title              text NOT NULL DEFAULT '',
  job_grade                   text NOT NULL DEFAULT '',
  employment_class            text NOT NULL DEFAULT 'staff'
    CHECK (employment_class IN ('staff','coordinator','department_manager','executive','project_manager')),
  guarantee_type              text NOT NULL DEFAULT 'none'
    CHECK (guarantee_type IN ('none','personal','financial','institutional')),
  guarantee_status            text NOT NULL DEFAULT 'not_required'
    CHECK (guarantee_status IN ('not_required','pending','active','released','forfeited')),
  guarantee_reference         text NOT NULL DEFAULT '',
  responsibility_scopes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_scopes            jsonb NOT NULL DEFAULT '[]'::jsonb,
  managed_department_codes    jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes                        text NOT NULL DEFAULT '',
  updated_by_actor_id          text NOT NULL,
  version                      integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(responsibility_scopes) = 'array'),
  CHECK (jsonb_typeof(authority_scopes) = 'array'),
  CHECK (jsonb_typeof(managed_department_codes) = 'array'),
  CHECK (guarantee_status NOT IN ('active','forfeited') OR (guarantee_type <> 'none' AND btrim(guarantee_reference) <> ''))
);

CREATE INDEX IF NOT EXISTS workforce_employee_governance_class_idx
  ON workforce_employee_governance(employment_class, guarantee_status, updated_at DESC);

INSERT INTO workforce_employee_governance(actor_id, position_title, updated_by_actor_id)
SELECT actor_id, COALESCE(role,''), 'migration'
FROM workforce_employee_profiles
ON CONFLICT (actor_id) DO NOTHING;

COMMENT ON TABLE workforce_employee_governance IS
  'Reviewed employee position, guarantee and responsibility scope; authentication permissions remain owned by Identity.';
