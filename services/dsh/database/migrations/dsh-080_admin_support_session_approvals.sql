-- JRN-031: maker-checker approval and operational readback for support sessions.

CREATE TABLE IF NOT EXISTS dsh_admin_support_session_requests (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_actor_id      TEXT        NOT NULL,
  requested_by         TEXT        NOT NULL,
  reason               TEXT        NOT NULL CHECK (length(trim(reason)) >= 5),
  duration_minutes     INTEGER     NOT NULL CHECK (duration_minutes BETWEEN 1 AND 15),
  status               TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','approved','rejected','issued','revoked')),
  reviewed_by          TEXT,
  review_note          TEXT,
  identity_session_id  TEXT,
  expires_at           TIMESTAMPTZ,
  version              INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at          TIMESTAMPTZ,
  issued_at            TIMESTAMPTZ,
  revoked_at           TIMESTAMPTZ,
  CHECK (target_actor_id <> requested_by),
  CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR
    (status IN ('approved','rejected','issued','revoked') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CHECK (
    (status IN ('pending','approved','rejected') AND identity_session_id IS NULL AND expires_at IS NULL)
    OR
    (status IN ('issued','revoked') AND identity_session_id IS NOT NULL AND expires_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_active_support_target
  ON dsh_admin_support_session_requests (target_actor_id)
  WHERE status IN ('pending','approved','issued');

CREATE INDEX IF NOT EXISTS idx_dsh_admin_support_status_created
  ON dsh_admin_support_session_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_support_requester
  ON dsh_admin_support_session_requests (requested_by, created_at DESC);
