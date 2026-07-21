-- dsh-084_partner_team_action_audit_context.sql
-- Completes the partner-team audit contract without rewriting applied migrations.
-- Every state-changing action carries a reason, correlation id, and idempotency key.

BEGIN;

ALTER TABLE dsh_store_team_member_actions
  ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS correlation_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT NOT NULL DEFAULT '';

ALTER TABLE dsh_store_team_member_actions
  DROP CONSTRAINT IF EXISTS chk_dsh_store_team_member_actions_reason_length,
  ADD CONSTRAINT chk_dsh_store_team_member_actions_reason_length
    CHECK (char_length(reason) <= 500),
  DROP CONSTRAINT IF EXISTS chk_dsh_store_team_member_actions_correlation_length,
  ADD CONSTRAINT chk_dsh_store_team_member_actions_correlation_length
    CHECK (char_length(correlation_id) <= 200),
  DROP CONSTRAINT IF EXISTS chk_dsh_store_team_member_actions_idempotency_length,
  ADD CONSTRAINT chk_dsh_store_team_member_actions_idempotency_length
    CHECK (char_length(idempotency_key) <= 240);

CREATE INDEX IF NOT EXISTS idx_dsh_store_team_member_actions_store_created
  ON dsh_store_team_member_actions(store_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_store_team_member_actions_idempotency
  ON dsh_store_team_member_actions(store_id, idempotency_key)
  WHERE idempotency_key <> '';

COMMIT;
