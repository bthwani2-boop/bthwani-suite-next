-- DSH-1082: Fence retired DSH catalog financial-policy columns after WLT cutover.
--
-- The five columns below are historical lineage only. WLT is the canonical
-- authority for commission and onboarding-fee policy. DSH catalog may still
-- create and mutate operational capability policy, but it must never establish
-- or change financial meaning through this table.

DO $$
BEGIN
  IF to_regclass('public.dsh_catalog_platform_policies') IS NULL THEN
    RAISE EXCEPTION 'dsh-1082 requires dsh_catalog_platform_policies';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION dsh_catalog_financial_policy_write_fence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.platform_commission_rate <> 0
       OR NEW.field_partner_onboarding_commission_amount <> 0
       OR NEW.field_partner_onboarding_commission_currency <> 'YER'
       OR NEW.store_onboarding_fee_amount <> 0
       OR NEW.store_onboarding_fee_currency <> 'YER' THEN
      RAISE EXCEPTION
        'DSH catalog financial policy is retired; commission and onboarding-fee policy is owned by WLT';
    END IF;
    RETURN NEW;
  END IF;

  IF ROW(
      NEW.platform_commission_rate,
      NEW.field_partner_onboarding_commission_amount,
      NEW.field_partner_onboarding_commission_currency,
      NEW.store_onboarding_fee_amount,
      NEW.store_onboarding_fee_currency
    ) IS DISTINCT FROM ROW(
      OLD.platform_commission_rate,
      OLD.field_partner_onboarding_commission_amount,
      OLD.field_partner_onboarding_commission_currency,
      OLD.store_onboarding_fee_amount,
      OLD.store_onboarding_fee_currency
    ) THEN
    RAISE EXCEPTION
      'DSH catalog financial policy is retired; commission and onboarding-fee policy is owned by WLT';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_dsh_catalog_financial_policy_write_fence
  ON dsh_catalog_platform_policies;

CREATE TRIGGER trg_dsh_catalog_financial_policy_write_fence
BEFORE INSERT OR UPDATE OF
  platform_commission_rate,
  field_partner_onboarding_commission_amount,
  field_partner_onboarding_commission_currency,
  store_onboarding_fee_amount,
  store_onboarding_fee_currency
ON dsh_catalog_platform_policies
FOR EACH ROW
EXECUTE FUNCTION dsh_catalog_financial_policy_write_fence();

COMMENT ON COLUMN dsh_catalog_platform_policies.platform_commission_rate
  IS 'HISTORICAL READ-ONLY lineage; canonical commission policy is WLT-owned.';
COMMENT ON COLUMN dsh_catalog_platform_policies.field_partner_onboarding_commission_amount
  IS 'HISTORICAL READ-ONLY lineage; canonical onboarding commission policy is WLT-owned.';
COMMENT ON COLUMN dsh_catalog_platform_policies.field_partner_onboarding_commission_currency
  IS 'HISTORICAL READ-ONLY lineage; canonical onboarding commission policy is WLT-owned.';
COMMENT ON COLUMN dsh_catalog_platform_policies.store_onboarding_fee_amount
  IS 'HISTORICAL READ-ONLY lineage; canonical store onboarding-fee policy is WLT-owned.';
COMMENT ON COLUMN dsh_catalog_platform_policies.store_onboarding_fee_currency
  IS 'HISTORICAL READ-ONLY lineage; canonical store onboarding-fee policy is WLT-owned.';
