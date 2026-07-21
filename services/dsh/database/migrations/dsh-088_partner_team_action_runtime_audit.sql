BEGIN;

ALTER TABLE dsh_store_team_member_actions
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

UPDATE dsh_store_team_member_actions
SET reason = COALESCE(NULLIF(BTRIM(reason), ''), 'legacy_team_action:' || action_label)
WHERE reason IS NULL OR BTRIM(reason) = '';

ALTER TABLE dsh_store_team_member_actions
  ALTER COLUMN reason SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_store_team_member_actions_store_idempotency
  ON dsh_store_team_member_actions (store_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_store_team_member_actions_correlation
  ON dsh_store_team_member_actions (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_store_team_member_actions_member_created
  ON dsh_store_team_member_actions (member_id, created_at DESC);

COMMIT;
