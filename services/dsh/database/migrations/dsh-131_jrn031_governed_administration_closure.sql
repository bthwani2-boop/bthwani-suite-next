-- JRN-031: governed administration closure
-- Adds reversible maker-checker decisions, permission scope metadata,
-- and append-only audit protection without moving Identity or Workforce truth into DSH.

ALTER TABLE dsh_admin_roles
  ADD COLUMN IF NOT EXISTS surfaces JSONB NOT NULL DEFAULT '["control-panel"]'::jsonb,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);

ALTER TABLE dsh_admin_roles
  DROP CONSTRAINT IF EXISTS dsh_admin_roles_surfaces_scope;
ALTER TABLE dsh_admin_roles
  ADD CONSTRAINT dsh_admin_roles_surfaces_scope
  CHECK (jsonb_typeof(surfaces) = 'array' AND surfaces ? 'control-panel');

ALTER TABLE dsh_admin_role_definition_requests
  ADD COLUMN IF NOT EXISTS surfaces JSONB NOT NULL DEFAULT '["control-panel"]'::jsonb;

ALTER TABLE dsh_admin_role_definition_requests
  DROP CONSTRAINT IF EXISTS dsh_admin_role_definition_surfaces_scope;
ALTER TABLE dsh_admin_role_definition_requests
  ADD CONSTRAINT dsh_admin_role_definition_surfaces_scope
  CHECK (jsonb_typeof(surfaces) = 'array' AND surfaces ? 'control-panel');

CREATE TABLE IF NOT EXISTS dsh_admin_rollback_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_approval_id   UUID NOT NULL REFERENCES dsh_admin_approval_requests(id) ON DELETE RESTRICT,
  inverse_action_type  TEXT NOT NULL CHECK (inverse_action_type IN ('staff_role_assignment','staff_role_revocation')),
  target_actor_id      TEXT NOT NULL,
  role_id              UUID NOT NULL REFERENCES dsh_admin_roles(id) ON DELETE RESTRICT,
  requested_by         TEXT NOT NULL,
  reason               TEXT NOT NULL CHECK (char_length(btrim(reason)) >= 5),
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by          TEXT,
  review_note          TEXT,
  version              INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at          TIMESTAMPTZ,
  CHECK (reviewed_by IS NULL OR reviewed_by <> requested_by),
  CHECK (requested_by <> target_actor_id),
  CHECK (reviewed_by IS NULL OR reviewed_by <> target_actor_id),
  CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR
    (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_rollback_pending_source
  ON dsh_admin_rollback_requests (source_approval_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_admin_rollback_status_created
  ON dsh_admin_rollback_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_rollback_target
  ON dsh_admin_rollback_requests (target_actor_id, created_at DESC);

ALTER TABLE dsh_admin_audit
  ADD COLUMN IF NOT EXISTS sensitivity TEXT NOT NULL DEFAULT 'internal'
    CHECK (sensitivity IN ('internal','restricted')),
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

CREATE INDEX IF NOT EXISTS idx_dsh_admin_audit_action_time
  ON dsh_admin_audit (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_audit_target_time
  ON dsh_admin_audit (target_id, created_at DESC);

CREATE OR REPLACE FUNCTION dsh_admin_audit_append_only_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('bthwani.audit_maintenance', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'dsh_admin_audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_admin_audit_append_only ON dsh_admin_audit;
CREATE TRIGGER trg_dsh_admin_audit_append_only
BEFORE UPDATE OR DELETE ON dsh_admin_audit
FOR EACH ROW EXECUTE FUNCTION dsh_admin_audit_append_only_guard();
