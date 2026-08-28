-- Identity-042: governed support-session credential recovery.
-- A lost bearer response is recovered by revoking the active credential and
-- issuing exactly one replacement for the same approved request fingerprint.

DROP INDEX IF EXISTS uq_identity_support_request;
DROP INDEX IF EXISTS uq_identity_support_request_fingerprint;

CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_support_request_active
  ON identity_sessions (support_request_id)
  WHERE session_kind = 'support' AND revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_support_request_fingerprint_active
  ON identity_sessions (support_request_id, support_payload_fingerprint)
  WHERE session_kind = 'support' AND revoked_at IS NULL;

COMMENT ON INDEX uq_identity_support_request_active IS
  'Exactly one usable support credential may exist for an approved request; retries rotate it under the same fingerprint.';
COMMENT ON INDEX uq_identity_support_request_fingerprint_active IS
  'Support request payload identity is replayable only while the resulting credential remains active.';
