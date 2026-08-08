-- WLT-118: OfficialWalletDestination replacing bank/IBAN/mobile-money fields
-- Unifies payout destination fields into a method and an encrypted reference,
-- and introduces a verification lifecycle.

BEGIN;

ALTER TABLE wlt_payout_destinations
  ADD COLUMN IF NOT EXISTS destination_method text,
  ADD COLUMN IF NOT EXISTS destination_reference_encrypted bytea,
  ADD COLUMN IF NOT EXISTS masked_destination_reference text,
  ADD COLUMN IF NOT EXISTS destination_verification_status text,
  ADD COLUMN IF NOT EXISTS destination_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS destination_verified_by_operator_id text;

-- Forward migration maps provable legacy rows (we map the values directly).
-- Legacy unprovable rows require re-verification (status = 'unverified').
UPDATE wlt_payout_destinations
SET destination_method = settlement_preference,
    destination_reference_encrypted = CASE
        WHEN settlement_preference = 'bank' AND masked_iban <> '' THEN iban_encrypted
        WHEN settlement_preference = 'bank' THEN account_number_encrypted
        WHEN settlement_preference = 'mobile_money' THEN payout_mobile_number_encrypted
        ELSE account_number_encrypted
    END,
    masked_destination_reference = CASE
        WHEN settlement_preference = 'bank' AND masked_iban <> '' THEN masked_iban
        WHEN settlement_preference = 'bank' THEN masked_account_number
        WHEN settlement_preference = 'mobile_money' THEN masked_mobile_number
        ELSE ''
    END,
    destination_verification_status = 'unverified';

ALTER TABLE wlt_payout_destinations
  ALTER COLUMN destination_method SET NOT NULL,
  ALTER COLUMN masked_destination_reference SET NOT NULL,
  ALTER COLUMN destination_verification_status SET NOT NULL;

ALTER TABLE wlt_payout_destinations
  ADD CONSTRAINT wlt_payout_destinations_verification_status_chk
  CHECK (destination_verification_status IN ('unverified', 'verified', 'rejected'));

-- Drop legacy columns
ALTER TABLE wlt_payout_destinations
  DROP COLUMN settlement_preference,
  DROP COLUMN bank_name,
  DROP COLUMN bank_branch,
  DROP COLUMN account_number_encrypted,
  DROP COLUMN iban_encrypted,
  DROP COLUMN payout_mobile_number_encrypted,
  DROP COLUMN bank_account_holder_matches_owner,
  DROP COLUMN bank_notes,
  DROP COLUMN masked_account_number,
  DROP COLUMN masked_iban,
  DROP COLUMN masked_mobile_number;

COMMIT;
