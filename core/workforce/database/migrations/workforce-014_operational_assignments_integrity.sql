-- Workforce-014: establish operational assignments with trusted platform
-- context, immutable actor attribution, bounded scope vocabulary and durable
-- audit isolation. The legacy duplicate workforce-012 file was never present
-- in the governed manifest or runtime ledger; this forward migration is the
-- first canonical application of that schema.

CREATE TABLE IF NOT EXISTS workforce_operational_assignments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id            text        NOT NULL,
  operator_context_id text        NOT NULL,
  role                text        NOT NULL,
  scope_type          text        NOT NULL,
  scope_target_id     text        NOT NULL,
  starts_on           timestamptz NOT NULL DEFAULT now(),
  ends_on             timestamptz,
  active              boolean     NOT NULL DEFAULT true,
  assigned_by         text        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workforce_operational_assignments
  ADD COLUMN IF NOT EXISTS operator_context_id text,
  ADD COLUMN IF NOT EXISTS assigned_by text;

UPDATE workforce_operational_assignments
SET operator_context_id = COALESCE(NULLIF(btrim(operator_context_id), ''), 'legacy-unknown'),
    assigned_by = COALESCE(NULLIF(btrim(assigned_by), ''), 'legacy-unknown');

ALTER TABLE workforce_operational_assignments
  ALTER COLUMN operator_context_id SET NOT NULL,
  ALTER COLUMN assigned_by SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workforce_operational_assignments_active_scope_uidx
  ON workforce_operational_assignments
    (actor_id, operator_context_id, role, scope_type, scope_target_id)
  WHERE active;

CREATE INDEX IF NOT EXISTS workforce_operational_assignments_actor_idx
  ON workforce_operational_assignments
    (actor_id, operator_context_id, active, scope_type, scope_target_id);

CREATE TABLE IF NOT EXISTS workforce_operational_assignment_audit (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id            text        NOT NULL,
  operator_context_id text        NOT NULL,
  role                text        NOT NULL,
  changed_by          text        NOT NULL,
  store_ids           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  service_areas       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  partner_ids         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  shift_codes         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  correlation_id      text        NOT NULL,
  request_hash        text        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workforce_operational_assignment_audit
  ADD COLUMN IF NOT EXISTS operator_context_id text,
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS request_hash text,
  ADD COLUMN IF NOT EXISTS partner_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shift_codes jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE workforce_operational_assignment_audit AS audit
SET operator_context_id = COALESCE(
      NULLIF(btrim(audit.operator_context_id), ''),
      (
        SELECT assignment.operator_context_id
        FROM workforce_operational_assignments AS assignment
        WHERE assignment.actor_id = audit.actor_id AND assignment.role = audit.role
        ORDER BY assignment.created_at DESC
        LIMIT 1
      ),
      'legacy-unknown'
    ),
    changed_by = COALESCE(NULLIF(btrim(audit.changed_by), ''), 'legacy-unknown'),
    correlation_id = COALESCE(NULLIF(btrim(audit.correlation_id), ''), 'legacy:' || audit.id::text),
    request_hash = COALESCE(NULLIF(btrim(audit.request_hash), ''), 'legacy:' || audit.id::text),
    store_ids = COALESCE(audit.store_ids, '[]'::jsonb),
    service_areas = COALESCE(audit.service_areas, '[]'::jsonb),
    partner_ids = COALESCE(audit.partner_ids, '[]'::jsonb),
    shift_codes = COALESCE(audit.shift_codes, '[]'::jsonb);

ALTER TABLE workforce_operational_assignment_audit
  ALTER COLUMN operator_context_id SET NOT NULL,
  ALTER COLUMN changed_by SET NOT NULL,
  ALTER COLUMN correlation_id SET NOT NULL,
  ALTER COLUMN request_hash SET NOT NULL,
  ALTER COLUMN store_ids SET NOT NULL,
  ALTER COLUMN service_areas SET NOT NULL,
  ALTER COLUMN partner_ids SET NOT NULL,
  ALTER COLUMN shift_codes SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_operational_assignment_scope_type_chk'
      AND conrelid = 'workforce_operational_assignments'::regclass
  ) THEN
    ALTER TABLE workforce_operational_assignments
      ADD CONSTRAINT workforce_operational_assignment_scope_type_chk
      CHECK (scope_type IN ('store', 'area', 'partner', 'shift')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_operational_assignment_nonblank_chk'
      AND conrelid = 'workforce_operational_assignments'::regclass
  ) THEN
    ALTER TABLE workforce_operational_assignments
      ADD CONSTRAINT workforce_operational_assignment_nonblank_chk
      CHECK (
        btrim(actor_id) <> '' AND btrim(operator_context_id) <> ''
        AND btrim(role) <> '' AND btrim(scope_target_id) <> ''
        AND btrim(assigned_by) <> ''
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_operational_assignment_period_chk'
      AND conrelid = 'workforce_operational_assignments'::regclass
  ) THEN
    ALTER TABLE workforce_operational_assignments
      ADD CONSTRAINT workforce_operational_assignment_period_chk
      CHECK (ends_on IS NULL OR ends_on > starts_on) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_operational_assignment_audit_integrity_chk'
      AND conrelid = 'workforce_operational_assignment_audit'::regclass
  ) THEN
    ALTER TABLE workforce_operational_assignment_audit
      ADD CONSTRAINT workforce_operational_assignment_audit_integrity_chk
      CHECK (
        btrim(actor_id) <> '' AND btrim(operator_context_id) <> ''
        AND btrim(role) <> '' AND btrim(changed_by) <> ''
        AND btrim(correlation_id) <> '' AND btrim(request_hash) <> ''
        AND jsonb_typeof(store_ids) = 'array'
        AND jsonb_typeof(service_areas) = 'array'
        AND jsonb_typeof(partner_ids) = 'array'
        AND jsonb_typeof(shift_codes) = 'array'
      ) NOT VALID;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS workforce_operational_assignment_audit_idempotency_uidx
  ON workforce_operational_assignment_audit
    (actor_id, operator_context_id, role, correlation_id);
