-- WLT-102 tenant isolation schema contract for settlements, COD records,
-- commissions and payout requests. Mirrors the style of
-- services/dsh/database/tests/schema/002_tenant_isolation_contract.test.sql:
-- verify the tenant_id column shape, then verify every existing row carries
-- a real or legacy-unscoped tenant (never NULL/blank).

\set ON_ERROR_STOP on

DO $$
DECLARE
  table_name_value TEXT;
  nullable_value TEXT;
  data_type_value TEXT;
  default_value TEXT;
  tenant_tables TEXT[] := ARRAY[
    'wlt_settlements',
    'wlt_cod_records',
    'wlt_commissions',
    'wlt_payout_requests'
  ];
BEGIN
  FOREACH table_name_value IN ARRAY tenant_tables LOOP
    SELECT is_nullable, data_type, column_default
    INTO nullable_value, data_type_value, default_value
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = table_name_value
      AND column_name = 'tenant_id';

    IF nullable_value IS NULL THEN
      RAISE EXCEPTION '%.tenant_id is missing', table_name_value;
    END IF;

    IF nullable_value <> 'NO' THEN
      RAISE EXCEPTION '%.tenant_id must be NOT NULL', table_name_value;
    END IF;

    IF data_type_value <> 'text' THEN
      RAISE EXCEPTION '%.tenant_id must be TEXT, found %', table_name_value, data_type_value;
    END IF;

    IF default_value NOT ILIKE '%legacy-unscoped%' THEN
      RAISE EXCEPTION '%.tenant_id must default to legacy-unscoped, found %', table_name_value, default_value;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'wlt_settlements_tenant_partner_idx'
  ) THEN RAISE EXCEPTION 'wlt_settlements_tenant_partner_idx is missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'wlt_cod_records_tenant_partner_idx'
  ) THEN RAISE EXCEPTION 'wlt_cod_records_tenant_partner_idx is missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'wlt_commissions_tenant_beneficiary_idx'
  ) THEN RAISE EXCEPTION 'wlt_commissions_tenant_beneficiary_idx is missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'wlt_payout_requests_tenant_beneficiary_idx'
  ) THEN RAISE EXCEPTION 'wlt_payout_requests_tenant_beneficiary_idx is missing'; END IF;

  IF EXISTS (SELECT 1 FROM wlt_settlements WHERE tenant_id IS NULL OR btrim(tenant_id) = '') THEN
    RAISE EXCEPTION 'wlt_settlements contains unowned tenant rows';
  END IF;

  IF EXISTS (SELECT 1 FROM wlt_cod_records WHERE tenant_id IS NULL OR btrim(tenant_id) = '') THEN
    RAISE EXCEPTION 'wlt_cod_records contains unowned tenant rows';
  END IF;

  IF EXISTS (SELECT 1 FROM wlt_commissions WHERE tenant_id IS NULL OR btrim(tenant_id) = '') THEN
    RAISE EXCEPTION 'wlt_commissions contains unowned tenant rows';
  END IF;

  IF EXISTS (SELECT 1 FROM wlt_payout_requests WHERE tenant_id IS NULL OR btrim(tenant_id) = '') THEN
    RAISE EXCEPTION 'wlt_payout_requests contains unowned tenant rows';
  END IF;
END
$$;

SELECT 'WLT-102 tenant scoping invariants passed' AS result;
