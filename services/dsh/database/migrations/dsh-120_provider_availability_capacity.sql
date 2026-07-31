-- DSH-120: Workforce availability projection, dispatch blocking and area capacity policy.
-- Workforce owns provider notices. DSH owns operational candidate, assignment,
-- capacity and shortage truth derived from those notices.

CREATE TABLE IF NOT EXISTS dsh_provider_availability_projections (
  operator_context_id             text NOT NULL CHECK (btrim(operator_context_id) <> ''),
  notice_id             text NOT NULL CHECK (btrim(notice_id) <> ''),
  actor_type            text NOT NULL CHECK (actor_type IN ('captain','field')),
  actor_id              text NOT NULL CHECK (btrim(actor_id) <> ''),
  notice_type           text NOT NULL CHECK (btrim(notice_type) <> ''),
  starts_at             timestamptz NOT NULL,
  ends_at               timestamptz NOT NULL,
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  reason                text NOT NULL DEFAULT '',
  source_updated_at     timestamptz NOT NULL,
  synced_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, notice_id),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS dsh_provider_availability_actor_window_idx
  ON dsh_provider_availability_projections(operator_context_id, actor_type, actor_id, starts_at, ends_at)
  WHERE status='active';

CREATE TABLE IF NOT EXISTS dsh_service_area_capacity_policies (
  operator_context_id                         text NOT NULL,
  service_area_code                 text NOT NULL,
  minimum_available_captains        integer NOT NULL DEFAULT 1 CHECK (minimum_available_captains >= 0),
  target_available_captains         integer NOT NULL DEFAULT 2 CHECK (target_available_captains >= minimum_available_captains),
  demand_buffer_basis_points        integer NOT NULL DEFAULT 2000 CHECK (demand_buffer_basis_points BETWEEN 0 AND 10000),
  mass_absence_threshold_basis_points integer NOT NULL DEFAULT 4000 CHECK (mass_absence_threshold_basis_points BETWEEN 1 AND 10000),
  forecast_horizon_minutes          integer NOT NULL DEFAULT 180 CHECK (forecast_horizon_minutes BETWEEN 15 AND 10080),
  updated_by                        text NOT NULL,
  version                           integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, service_area_code)
);

CREATE OR REPLACE FUNCTION dsh_assert_no_active_captain_absence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.idempotency_key IS NULL OR NEW.status NOT IN ('offered','accepted') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM dsh_provider_availability_projections absence
    WHERE absence.operator_context_id=NEW.operator_context_id
      AND absence.actor_type='captain'
      AND absence.actor_id=NEW.captain_id
      AND absence.status='active'
      AND now() >= absence.starts_at
      AND now() < absence.ends_at
  ) THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='CAPTAIN_UNAVAILABLE_BY_WORKFORCE_NOTICE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_assignment_captain_absence ON dsh_assignments;
CREATE TRIGGER trg_dsh_assignment_captain_absence
BEFORE INSERT OR UPDATE OF status,captain_id,operator_context_id,idempotency_key
ON dsh_assignments
FOR EACH ROW EXECUTE FUNCTION dsh_assert_no_active_captain_absence();

COMMENT ON TABLE dsh_provider_availability_projections IS
  'Read-only DSH projection of Workforce provider notices used for dispatch and capacity decisions.';
COMMENT ON TABLE dsh_service_area_capacity_policies IS
  'DSH-owned operational capacity thresholds and shortage forecasting policy by service area.';
