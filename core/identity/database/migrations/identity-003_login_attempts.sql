CREATE TABLE IF NOT EXISTS identity_login_attempts (
  id            bigserial PRIMARY KEY,
  username      text NOT NULL,
  succeeded     boolean NOT NULL,
  ip_address    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_login_attempts_username_time_idx
  ON identity_login_attempts(username, created_at DESC);

CREATE INDEX IF NOT EXISTS identity_login_attempts_time_idx
  ON identity_login_attempts(created_at);
