-- DSH-964: Drop dead client-loyalty ledger tables (D1 remediation).
--
-- dsh_client_loyalty_accounts and dsh_loyalty_ledger were added by dsh-058 as
-- a parallel client loyalty ledger, but no code path in this repository ever
-- wrote to them (loyalty earn/reversal has always flowed through
-- internal/wltoutbox to WLT's wlt_loyalty_accounts / wlt_loyalty_entries,
-- which are the real, append-only, trigger-enforced ledger). The only two
-- readers (LoyaltySummary, GetClientBenefits/getClientLoyaltyAccount) were
-- themselves dead code with zero live callers -- superseded by
-- handleListLoyaltyTiers (uses wlt.GetCommercialSummary) and
-- handleGetClientBenefits (uses wlt.GetClientCommercialBenefits), both of
-- which already correctly read loyalty truth from WLT. Since these tables
-- were always empty in production, no backfill or data migration is needed.
--
-- dsh_loyalty_tiers (the DSH-owned tier *policy* catalog) is unrelated and
-- is not touched by this migration.

DO $$
DECLARE
  ledger_count integer;
  accounts_count integer;
BEGIN
  SELECT count(*) INTO ledger_count FROM dsh_loyalty_ledger;
  SELECT count(*) INTO accounts_count FROM dsh_client_loyalty_accounts;
  IF ledger_count > 0 OR accounts_count > 0 THEN
    RAISE EXCEPTION 'dsh-964: refusing to drop non-empty dead loyalty tables (dsh_loyalty_ledger=%, dsh_client_loyalty_accounts=%); this contradicts the "always empty" analysis and needs investigation before the migration can proceed', ledger_count, accounts_count;
  END IF;
END $$;

DROP TABLE IF EXISTS dsh_loyalty_ledger;
DROP TABLE IF EXISTS dsh_client_loyalty_accounts;
