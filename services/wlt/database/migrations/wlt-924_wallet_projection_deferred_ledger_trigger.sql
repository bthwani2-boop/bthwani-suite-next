-- WLT-924: defer canonical ledger-account wallet refresh until transaction close.
--
-- WLT-923 deferred workflow-source refreshes, but canonical ledger account
-- balance updates still refreshed wlt_wallets immediately. Reversal flows update
-- the ledger and the workflow source row in the same transaction; an immediate
-- ledger refresh can see the new canonical balance before the source row has
-- left a restricted status and incorrectly fail the restricted-balance guard.

BEGIN;

DROP TRIGGER IF EXISTS wlt_ledger_accounts_wallet_projection_trg
  ON wlt_ledger_accounts;

CREATE CONSTRAINT TRIGGER wlt_ledger_accounts_wallet_projection_trg
  AFTER INSERT OR UPDATE
  ON wlt_ledger_accounts
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  WHEN (NEW.account_type = 'wallet')
  EXECUTE FUNCTION wlt_refresh_wallet_projection_from_ledger();

COMMENT ON FUNCTION wlt_refresh_wallet_projection_from_ledger() IS
  'Refreshes wallet materialization from canonical ledger accounts at transaction close so workflow source-row transitions and ledger reversals are evaluated together.';

COMMIT;
