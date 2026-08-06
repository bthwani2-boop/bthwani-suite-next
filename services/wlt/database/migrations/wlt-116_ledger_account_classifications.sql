-- WLT-116: Financial Account Classifications for J081 compliance.
--
-- Adds standard accounting classifications (asset, liability, equity, income, expense)
-- to ledger accounts, establishing a true chart of accounts structure.

BEGIN;

ALTER TABLE wlt_ledger_accounts ADD COLUMN IF NOT EXISTS classification text;

UPDATE wlt_ledger_accounts
SET classification = CASE account_type
    WHEN 'wallet' THEN 'liability'
    WHEN 'platform_payable' THEN 'liability'
    WHEN 'provider_clearing' THEN 'asset'
    WHEN 'platform_commission_receivable' THEN 'asset'
    WHEN 'platform_revenue' THEN 'income'
    ELSE 'liability'
END
WHERE classification IS NULL OR btrim(classification) = '';

ALTER TABLE wlt_ledger_accounts ALTER COLUMN classification SET NOT NULL;

ALTER TABLE wlt_ledger_accounts
    DROP CONSTRAINT IF EXISTS wlt_ledger_accounts_classification_chk;

ALTER TABLE wlt_ledger_accounts
    ADD CONSTRAINT wlt_ledger_accounts_classification_chk CHECK (
        classification IN ('asset', 'liability', 'equity', 'income', 'expense')
    );

COMMENT ON COLUMN wlt_ledger_accounts.classification IS
  'Standard accounting classification defining the natural balance and financial statement position of the account.';

COMMIT;
