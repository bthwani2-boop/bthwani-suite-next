-- dsh-996_administration_approval_ledger.sql
--
-- dsh-990_workforce_assignment_cleanup.sql dropped dsh_admin_approval_requests,
-- dsh_admin_rollback_requests, and dsh_admin_role_definition_requests on the
-- premise that their owning Go code had already been retired. That premise
-- was false: internal/administration/{approvals,role_requests,rollback}.go
-- and the eleven routes registered in internal/http/server.go read and write
-- these tables today. On a fully migrated database every approval,
-- role-request, and rollback endpoint fails.
--
-- This migration restores them as DSH's governed approval-workflow ledger
-- (request, review, audit trail) — not as an authorization truth. The
-- canonical authorization truth (role definitions, actor role assignments)
-- is owned by Identity (identity_roles, identity_actor_roles) and is applied
-- through the Identity RBAC internal API before an approval is allowed to
-- reach status='approved'. dsh_admin_staff_assignments is deliberately NOT
-- recreated: that projection belonged to the parallel local authority this
-- package retires.
--
-- Column shapes and constraints below reproduce the pre-dsh-990 final state
-- exactly (dsh-076, dsh-078, dsh-079_admin_role_assignment_revocations,
-- dsh-131_governed_administration_closure), so the existing Go queries in
-- internal/administration/*.go require no column-level changes.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_admin_approval_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type       TEXT        NOT NULL CHECK (action_type IN ('staff_role_assignment','staff_role_revocation')),
  target_actor_id   TEXT        NOT NULL,
  role_id           UUID        NOT NULL REFERENCES dsh_admin_roles(id) ON DELETE RESTRICT,
  requested_by      TEXT        NOT NULL,
  reason            TEXT        NOT NULL CHECK (length(trim(reason)) >= 5),
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','rejected')),
  reviewed_by       TEXT,
  review_note       TEXT,
  version           INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  CHECK (requested_by <> target_actor_id),
  CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR
    (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_pending_role_change
  ON dsh_admin_approval_requests (action_type, target_actor_id, role_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_admin_approval_status_created
  ON dsh_admin_approval_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_approval_requested_by
  ON dsh_admin_approval_requests (requested_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_approval_reviewed_by
  ON dsh_admin_approval_requests (reviewed_by, reviewed_at DESC)
  WHERE reviewed_by IS NOT NULL;

CREATE TABLE IF NOT EXISTS dsh_admin_role_definition_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name     TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  permissions   JSONB       NOT NULL,
  surfaces      JSONB       NOT NULL DEFAULT '["control-panel"]'::jsonb,
  requested_by  TEXT        NOT NULL,
  reason        TEXT        NOT NULL CHECK (length(trim(reason)) >= 5),
  status        TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  reviewed_by   TEXT,
  review_note   TEXT,
  version       INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  CHECK (length(trim(role_name)) BETWEEN 3 AND 80),
  CHECK (jsonb_typeof(permissions) = 'array'),
  CHECK (jsonb_typeof(surfaces) = 'array' AND surfaces ? 'control-panel'),
  CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR
    (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_pending_role_definition
  ON dsh_admin_role_definition_requests (lower(role_name))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_admin_role_definition_status_created
  ON dsh_admin_role_definition_requests (status, created_at DESC);

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

COMMIT;
