-- IDENTITY-022: Refresh Rotation Concurrency

ALTER TABLE identity_sessions
  ADD COLUMN IF NOT EXISTS previous_refresh_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS refresh_rotated_at TIMESTAMPTZ;

COMMENT ON COLUMN identity_sessions.previous_refresh_token_hash IS
  'Hash of the immediately preceding refresh token, retained only to distinguish a concurrent retry from older replay.';

COMMENT ON COLUMN identity_sessions.refresh_rotated_at IS
  'Timestamp of the most recent successful refresh rotation.';
