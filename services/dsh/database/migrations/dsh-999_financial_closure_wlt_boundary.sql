-- J079 / Financial Closure: WLT is the sole owner of financial truth.
-- DSH must not store commission rates or amounts.

ALTER TABLE dsh_catalog_platform_policies
  DROP COLUMN IF EXISTS platform_commission_rate,
  DROP COLUMN IF EXISTS field_partner_onboarding_commission_amount,
  DROP COLUMN IF EXISTS field_partner_onboarding_commission_currency;
