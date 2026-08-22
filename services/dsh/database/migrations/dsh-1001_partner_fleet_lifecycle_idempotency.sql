-- DSH-1001: canonical Partner fleet lifecycle receipts.
-- Forward-only extension of the dsh_captain_memberships authority restored by
-- dsh-1000. Plaintext connection codes remain outside persistence.

BEGIN;

ALTER TABLE dsh_partner_courier_connection_codes
  ADD COLUMN IF NOT EXISTS issue_idempotency_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS issue_correlation_id TEXT NOT NULL DEFAULT '';

ALTER TABLE dsh_partner_courier_connection_codes
  DROP CONSTRAINT IF EXISTS dsh_partner_courier_issue_idempotency_length_chk,
  ADD CONSTRAINT dsh_partner_courier_issue_idempotency_length_chk
    CHECK (char_length(issue_idempotency_key) <= 240),
  DROP CONSTRAINT IF EXISTS dsh_partner_courier_issue_correlation_length_chk,
  ADD CONSTRAINT dsh_partner_courier_issue_correlation_length_chk
    CHECK (char_length(issue_correlation_id) <= 240);

CREATE UNIQUE INDEX IF NOT EXISTS dsh_partner_courier_issue_idempotency_uidx
  ON dsh_partner_courier_connection_codes(store_id, team_member_id, issue_idempotency_key)
  WHERE btrim(issue_idempotency_key) <> '';

ALTER TABLE dsh_captain_membership_history
  DROP CONSTRAINT IF EXISTS dsh_captain_membership_history_action_length_chk,
  ADD CONSTRAINT dsh_captain_membership_history_action_length_chk
    CHECK (char_length(action_label) <= 120),
  DROP CONSTRAINT IF EXISTS dsh_captain_membership_history_idempotency_length_chk,
  ADD CONSTRAINT dsh_captain_membership_history_idempotency_length_chk
    CHECK (char_length(idempotency_key) <= 240),
  DROP CONSTRAINT IF EXISTS dsh_captain_membership_history_correlation_length_chk,
  ADD CONSTRAINT dsh_captain_membership_history_correlation_length_chk
    CHECK (char_length(correlation_id) <= 240);

COMMIT;
