-- JRN-031: governed maker-checker approval queue for administrative role assignments.

CREATE TABLE IF NOT EXISTS dsh_admin_approval_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type       TEXT        NOT NULL CHECK (action_type IN ('staff_role_assignment')),
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_pending_role_assignment
  ON dsh_admin_approval_requests (target_actor_id, role_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_admin_approval_status_created
  ON dsh_admin_approval_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_approval_requested_by
  ON dsh_admin_approval_requests (requested_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_approval_reviewed_by
  ON dsh_admin_approval_requests (reviewed_by, reviewed_at DESC)
  WHERE reviewed_by IS NOT NULL;
