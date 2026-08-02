-- DSH-963: Drop raw partner bank credential columns (D3 remediation).
--
-- dsh-040 declared "DSH no longer stores raw bank account numbers" and added
-- masked_account_number/masked_iban/masked_mobile_number for display, but the
-- original raw columns from dsh-027 were never actually dropped. The only
-- code path that wrote to them directly (bypassing the WLT payout-destination
-- handoff) was dead, unregistered handler code, now removed. The live,
-- governed path (UpdatePartnerGoverned) always sent raw values to WLT via
-- wltClient.UpsertPayoutDestination and immediately cleared the raw columns
-- to '' before persisting -- so no live partner row should carry non-empty
-- raw values. This migration verifies that invariant and then drops the
-- raw columns entirely, closing the exposure at the schema level rather than
-- relying on application code discipline.

DO $$
DECLARE
  residual_count integer;
BEGIN
  SELECT count(*) INTO residual_count
  FROM dsh_partners
  WHERE bank_account_number <> '' OR bank_iban <> '' OR payout_mobile_number <> '';

  IF residual_count > 0 THEN
    RAISE NOTICE 'dsh-963: masking and clearing % dsh_partners row(s) with residual raw bank data written outside the governed WLT handoff', residual_count;

    -- Back-fill any missing masked display value using the same masking
    -- scheme as dsh-040, so a residual row from the removed ungoverned path
    -- does not lose its display value entirely.
    UPDATE dsh_partners
    SET
      masked_account_number = CASE
        WHEN masked_account_number <> '' THEN masked_account_number
        WHEN length(bank_account_number) > 4
          THEN repeat('*', length(bank_account_number) - 4) || right(bank_account_number, 4)
        ELSE repeat('*', length(bank_account_number))
      END,
      masked_iban = CASE
        WHEN masked_iban <> '' THEN masked_iban
        WHEN length(bank_iban) > 4
          THEN repeat('*', length(bank_iban) - 4) || right(bank_iban, 4)
        ELSE repeat('*', length(bank_iban))
      END,
      masked_mobile_number = CASE
        WHEN masked_mobile_number <> '' THEN masked_mobile_number
        WHEN length(payout_mobile_number) > 4
          THEN repeat('*', length(payout_mobile_number) - 4) || right(payout_mobile_number, 4)
        ELSE repeat('*', length(payout_mobile_number))
      END
    WHERE bank_account_number <> '' OR bank_iban <> '' OR payout_mobile_number <> '';

    UPDATE dsh_partners
    SET bank_account_number = '', bank_iban = '', payout_mobile_number = ''
    WHERE bank_account_number <> '' OR bank_iban <> '' OR payout_mobile_number <> '';
  END IF;
END $$;

ALTER TABLE dsh_partners
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_iban,
  DROP COLUMN IF EXISTS payout_mobile_number;
