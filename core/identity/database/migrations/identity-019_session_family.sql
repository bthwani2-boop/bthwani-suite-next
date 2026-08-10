-- DSH-019: Session Family Model

ALTER TABLE identity_sessions
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS compromised_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS network_metadata JSONB;

-- Track compromised sessions explicitly.
CREATE INDEX IF NOT EXISTS idx_identity_sessions_compromised
  ON identity_sessions (compromised_at)
  WHERE compromised_at IS NOT NULL;
