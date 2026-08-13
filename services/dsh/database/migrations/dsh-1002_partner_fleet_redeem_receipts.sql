-- DSH-1002: forward-only receipt fields for replay-safe captain redemption.

BEGIN;

ALTER TABLE dsh_partner_courier_connection_codes
  ADD COLUMN IF NOT EXISTS redeem_idempotency_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS redeem_correlation_id TEXT NOT NULL DEFAULT '';

ALTER TABLE dsh_partner_courier_connection_codes
  DROP CONSTRAINT IF EXISTS dsh_partner_courier_redeem_idempotency_length_chk,
  ADD CONSTRAINT dsh_partner_courier_redeem_idempotency_length_chk
    CHECK (char_length(redeem_idempotency_key) <= 240),
  DROP CONSTRAINT IF EXISTS dsh_partner_courier_redeem_correlation_length_chk,
  ADD CONSTRAINT dsh_partner_courier_redeem_correlation_length_chk
    CHECK (char_length(redeem_correlation_id) <= 240);

COMMIT;
