-- LEGACY_FILENAME_ONLY — not a slice reference
-- WORKFORCE-012: Operational Assignments for field agents (store, area, partner, shift)

CREATE TABLE IF NOT EXISTS workforce_operational_assignments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id            TEXT        NOT NULL,
  operator_context_id TEXT        NOT NULL,
  role                TEXT        NOT NULL,
  scope_type          TEXT        NOT NULL, -- 'store', 'area', 'partner', 'shift'
  scope_target_id     TEXT        NOT NULL, -- e.g. store_id or area_code
  starts_on           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_on             TIMESTAMPTZ, -- null means indefinite
  active              BOOLEAN     NOT NULL DEFAULT true,
  assigned_by         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workforce_operational_assignments_actor 
  ON workforce_operational_assignments (actor_id, operator_context_id, active, scope_type, scope_target_id);

CREATE TABLE IF NOT EXISTS workforce_operational_assignment_audit (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       TEXT        NOT NULL,
  role           TEXT        NOT NULL,
  changed_by     TEXT,
  store_ids      JSONB       DEFAULT '[]'::jsonb,
  service_areas  JSONB       DEFAULT '[]'::jsonb,
  correlation_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
