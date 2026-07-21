-- JRN-031: maker-checker lifecycle for creating DSH administration roles.

CREATE TABLE IF NOT EXISTS dsh_admin_role_definition_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name     TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  permissions   JSONB       NOT NULL,
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
