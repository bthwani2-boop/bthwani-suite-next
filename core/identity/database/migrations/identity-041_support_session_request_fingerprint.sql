-- Durable support-session command identity for crash-safe issue retries.
ALTER TABLE identity_sessions
  ADD COLUMN IF NOT EXISTS support_payload_fingerprint TEXT;

ALTER TABLE identity_sessions
  DROP CONSTRAINT IF EXISTS identity_sessions_support_fingerprint_shape_check;

ALTER TABLE identity_sessions
  ADD CONSTRAINT identity_sessions_support_fingerprint_shape_check
  CHECK ((session_kind = 'standard' AND support_payload_fingerprint IS NULL)
      OR (session_kind = 'support' AND support_payload_fingerprint IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_support_request_fingerprint
  ON identity_sessions (support_request_id, support_payload_fingerprint)
  WHERE session_kind = 'support';
