-- DSH-104: OfficialWalletDestination replacing bank/IBAN/mobile-money fields
-- Unifies payout destination fields into a method and a masked reference,
-- and introduces a verification lifecycle mirroring WLT.

BEGIN;

ALTER TABLE dsh_partners
  ADD COLUMN IF NOT EXISTS destination_method text,
  ADD COLUMN IF NOT EXISTS masked_destination_reference text,
  ADD COLUMN IF NOT EXISTS destination_verification_status text;

-- Forward migration maps provable legacy rows (we map the values directly).
-- Legacy unprovable rows require re-verification (status = 'unverified').
UPDATE dsh_partners
SET destination_method = settlement_preference,
    masked_destination_reference = CASE
        WHEN settlement_preference = 'bank' AND masked_iban <> '' THEN masked_iban
        WHEN settlement_preference = 'bank' THEN masked_account_number
        WHEN settlement_preference = 'mobile_money' THEN masked_mobile_number
        ELSE ''
    END,
    destination_verification_status = 'unverified';

ALTER TABLE dsh_partners
  ALTER COLUMN destination_method SET NOT NULL,
  ALTER COLUMN masked_destination_reference SET NOT NULL,
  ALTER COLUMN destination_verification_status SET NOT NULL;

ALTER TABLE dsh_partners
  ADD CONSTRAINT dsh_partners_destination_verification_status_chk
  CHECK (destination_verification_status IN ('unverified', 'verified', 'rejected'));

-- Drop legacy columns
ALTER TABLE dsh_partners
  DROP COLUMN settlement_preference,
  DROP COLUMN bank_name,
  DROP COLUMN bank_branch,
  DROP COLUMN masked_account_number,
  DROP COLUMN masked_iban,
  DROP COLUMN masked_mobile_number;

ALTER TABLE dsh_partner_wlt_reconciliation_cases
  ADD COLUMN IF NOT EXISTS wlt_destination_method text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wlt_masked_destination_reference text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wlt_destination_verification_status text NOT NULL DEFAULT '';

-- Migrate reconciliation cases data
UPDATE dsh_partner_wlt_reconciliation_cases
SET wlt_masked_destination_reference = CASE
        WHEN wlt_masked_iban <> '' THEN wlt_masked_iban
        WHEN wlt_masked_account_number <> '' THEN wlt_masked_account_number
        ELSE wlt_masked_mobile_number
    END;

ALTER TABLE dsh_partner_wlt_reconciliation_cases
  DROP COLUMN wlt_masked_account_number,
  DROP COLUMN wlt_masked_iban,
  DROP COLUMN wlt_masked_mobile_number;

COMMIT;
