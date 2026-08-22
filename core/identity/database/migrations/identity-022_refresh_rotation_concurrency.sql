-- IDENTITY-022: Refresh Rotation Concurrency

ALTER TABLE identity_sessions
  ADD COLUMN IF NOT EXISTS previous_refresh_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS refresh_rotated_at TIMESTAMPTZ;

COMMENT ON COLUMN identity_sessions.previous_refresh_token_hash IS
  'Hash of the immediately preceding refresh token, retained only to distinguish a concurrent retry from older replay.';

COMMENT ON COLUMN identity_sessions.refresh_rotated_at IS
  'Timestamp of the most recent successful refresh rotation.';

CREATE OR REPLACE FUNCTION identity_capture_refresh_rotation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.refresh_token_hash IS DISTINCT FROM OLD.refresh_token_hash THEN
    NEW.previous_refresh_token_hash := OLD.refresh_token_hash;
    NEW.refresh_rotated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS identity_sessions_capture_refresh_rotation ON identity_sessions;

CREATE TRIGGER identity_sessions_capture_refresh_rotation
BEFORE UPDATE OF refresh_token_hash ON identity_sessions
FOR EACH ROW
EXECUTE FUNCTION identity_capture_refresh_rotation();
