-- DSH-101: J077 multidimensional and moderated ratings

-- Add JSONB columns for multidimensional ratings and automated fraud flags
ALTER TABLE dsh_provider_ratings
  ADD COLUMN IF NOT EXISTS dimensions JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fraud_signals JSONB NOT NULL DEFAULT '{}';

-- Add moderation state
ALTER TABLE dsh_provider_ratings
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending'
  CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'disputed'));

-- Add partner response and dispute reasoning
ALTER TABLE dsh_provider_ratings
  ADD COLUMN IF NOT EXISTS partner_response text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dispute_reason text NOT NULL DEFAULT '';

-- Add corresponding columns to events to maintain audit trail
ALTER TABLE dsh_provider_rating_events
  ADD COLUMN IF NOT EXISTS dimensions JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fraud_signals JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS partner_response text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dispute_reason text NOT NULL DEFAULT '';

-- Add index on moderation_status to assist with operational queries
CREATE INDEX IF NOT EXISTS idx_dsh_provider_ratings_moderation
  ON dsh_provider_ratings(operator_context_id, moderation_status, created_at DESC);
