-- DSH-040: Partner payout destination reference
-- After Phase 5, DSH no longer stores raw bank account numbers.
-- All financial payout data is stored in WLT (wlt_payout_destinations).
-- DSH keeps only a reference ID and masked display strings for the control
-- panel UI. The existing raw bank columns from dsh-027 are preserved for
-- backward compatibility but will be cleared to '' going forward.

ALTER TABLE dsh_partners
  ADD COLUMN IF NOT EXISTS payout_destination_id     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS masked_account_number     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS masked_iban               text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS masked_mobile_number      text NOT NULL DEFAULT '';

-- Back-fill masked display for any existing rows that have real data.
-- Masks all but the last 4 characters to protect financial data at rest.
UPDATE dsh_partners
SET
  masked_account_number = CASE
    WHEN length(bank_account_number) > 4
    THEN repeat('*', length(bank_account_number) - 4) || right(bank_account_number, 4)
    ELSE repeat('*', length(bank_account_number))
  END,
  masked_iban = CASE
    WHEN length(bank_iban) > 4
    THEN repeat('*', length(bank_iban) - 4) || right(bank_iban, 4)
    ELSE repeat('*', length(bank_iban))
  END,
  masked_mobile_number = CASE
    WHEN length(payout_mobile_number) > 4
    THEN repeat('*', length(payout_mobile_number) - 4) || right(payout_mobile_number, 4)
    ELSE repeat('*', length(payout_mobile_number))
  END
WHERE bank_account_number <> '' OR bank_iban <> '' OR payout_mobile_number <> '';
