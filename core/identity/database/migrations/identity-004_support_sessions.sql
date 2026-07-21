-- JRN-031: controlled access-only support sessions owned by Identity.

ALTER TABLE identity_sessions
  ADD COLUMN IF NOT EXISTS session_kind TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS initiator_actor_id TEXT REFERENCES identity_actors(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS support_request_id TEXT,
  ADD COLUMN IF NOT EXISTS support_reason TEXT,
  ADD COLUMN IF NOT EXISTS effective_roles TEXT[],
  ADD COLUMN IF NOT EXISTS effective_permissions JSONB;

ALTER TABLE identity_sessions
  ALTER COLUMN refresh_token_hash DROP NOT NULL,
  ALTER COLUMN refresh_expires_at DROP NOT NULL;

ALTER TABLE identity_sessions
  DROP CONSTRAINT IF EXISTS identity_sessions_session_kind_check;

ALTER TABLE identity_sessions
  ADD CONSTRAINT identity_sessions_session_kind_check
  CHECK (session_kind IN ('standard','support'));

ALTER TABLE identity_sessions
  DROP CONSTRAINT IF EXISTS identity_sessions_refresh_shape_check;

ALTER TABLE identity_sessions
  ADD CONSTRAINT identity_sessions_refresh_shape_check
  CHECK (
    (session_kind = 'standard' AND refresh_token_hash IS NOT NULL AND refresh_expires_at IS NOT NULL)
    OR
    (session_kind = 'support' AND refresh_token_hash IS NULL AND refresh_expires_at IS NULL)
  );

ALTER TABLE identity_sessions
  DROP CONSTRAINT IF EXISTS identity_sessions_support_shape_check;

ALTER TABLE identity_sessions
  ADD CONSTRAINT identity_sessions_support_shape_check
  CHECK (
    (session_kind = 'standard'
      AND initiator_actor_id IS NULL
      AND support_request_id IS NULL
      AND support_reason IS NULL
      AND effective_roles IS NULL
      AND effective_permissions IS NULL)
    OR
    (session_kind = 'support'
      AND initiator_actor_id IS NOT NULL
      AND support_request_id IS NOT NULL
      AND length(trim(support_reason)) >= 5
      AND effective_roles IS NOT NULL
      AND effective_permissions IS NOT NULL
      AND access_expires_at <= created_at + INTERVAL '15 minutes')
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_support_request
  ON identity_sessions (support_request_id)
  WHERE session_kind = 'support';

CREATE INDEX IF NOT EXISTS idx_identity_support_initiator
  ON identity_sessions (initiator_actor_id, created_at DESC)
  WHERE session_kind = 'support';

CREATE TABLE IF NOT EXISTS identity_support_session_audit (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  support_request_id  TEXT        NOT NULL,
  session_id          UUID        REFERENCES identity_sessions(id) ON DELETE SET NULL,
  target_actor_id     TEXT        NOT NULL REFERENCES identity_actors(id) ON DELETE RESTRICT,
  initiator_actor_id  TEXT        NOT NULL REFERENCES identity_actors(id) ON DELETE RESTRICT,
  event_type          TEXT        NOT NULL CHECK (event_type IN ('issued','revoked','expired')),
  reason              TEXT        NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_support_audit_request
  ON identity_support_session_audit (support_request_id, created_at DESC);
