-- DSH-1083: eliminate parallel financial truth from dsh_catalog_platform_policies.
-- WLT is the sole canonical financial owner of commissions and onboarding fees.
-- Central catalog retains only operational/taxonomy capability flags.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.dsh_catalog_platform_policies') IS NULL THEN
    RAISE EXCEPTION 'DSH_CATALOG_PLATFORM_POLICIES_MISSING' USING ERRCODE = '42P01';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_catalog_financial_policy_write_fence
  ON dsh_catalog_platform_policies;

DROP FUNCTION IF EXISTS dsh_catalog_financial_policy_write_fence();

ALTER TABLE dsh_catalog_platform_policies
  DROP COLUMN IF EXISTS platform_commission_rate,
  DROP COLUMN IF EXISTS field_partner_onboarding_commission_amount,
  DROP COLUMN IF EXISTS field_partner_onboarding_commission_currency,
  DROP COLUMN IF EXISTS store_onboarding_fee_amount,
  DROP COLUMN IF EXISTS store_onboarding_fee_currency;

COMMIT;
