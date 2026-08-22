-- Preserve historical cash-in-transit ledger rows for readback, but reject
-- every new account row so the retired COD custody rail cannot be reopened
-- through direct database writes.
ALTER TABLE wlt_ledger_accounts
  DROP CONSTRAINT IF EXISTS wlt_ledger_accounts_legacy_cod_account_write_fence;

ALTER TABLE wlt_ledger_accounts
  ADD CONSTRAINT wlt_ledger_accounts_legacy_cod_account_write_fence
  CHECK (account_type <> 'cash_in_transit') NOT VALID;

COMMENT ON CONSTRAINT wlt_ledger_accounts_legacy_cod_account_write_fence ON wlt_ledger_accounts IS
  'Historical cash_in_transit accounts remain readable; new retired COD custody accounts are rejected.';
