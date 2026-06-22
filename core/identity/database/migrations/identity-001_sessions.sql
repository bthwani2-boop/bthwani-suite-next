CREATE TABLE IF NOT EXISTS identity_actors (
  id            text PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  tenant_id     text NOT NULL,
  roles         text[] NOT NULL,
  permissions   jsonb NOT NULL DEFAULT '[]'::jsonb,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_sessions (
  id                    text PRIMARY KEY,
  actor_id              text NOT NULL REFERENCES identity_actors(id) ON DELETE CASCADE,
  access_token_hash     text NOT NULL UNIQUE,
  refresh_token_hash    text NOT NULL UNIQUE,
  device_fingerprint    text,
  access_expires_at     timestamptz NOT NULL,
  refresh_expires_at    timestamptz NOT NULL,
  revoked_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_sessions_actor_idx
  ON identity_sessions(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS identity_sessions_access_expiry_idx
  ON identity_sessions(access_expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS identity_sessions_refresh_expiry_idx
  ON identity_sessions(refresh_expires_at) WHERE revoked_at IS NULL;
