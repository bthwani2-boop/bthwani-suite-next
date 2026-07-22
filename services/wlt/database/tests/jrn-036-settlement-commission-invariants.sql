\set ON_ERROR_STOP on

DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'wlt_jrn036_settlement_requests',
    'wlt_jrn036_settlement_source_evidence',
    'wlt_jrn036_settlement_policy_versions',
    'wlt_jrn036_commission_policy_versions',
    'wlt_jrn036_commission_evidence',
    'wlt_jrn036_commission_adjustments',
    'wlt_jrn036_audit_events'
  ] LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'missing JRN-036 table %', required_table;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wlt_jrn036_settlement_refund_basis_chk'
  ) THEN
    RAISE EXCEPTION 'missing refund/basis arithmetic constraint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'wlt_jrn036_commission_policy_active_uidx'
      AND indexdef LIKE '%WHERE (status = ''active''::text)%'
  ) THEN
    RAISE EXCEPTION 'missing one-active-commission-policy invariant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'wlt_jrn036_commission_request_hash_uidx'
      AND indexdef LIKE 'CREATE UNIQUE INDEX%'
  ) THEN
    RAISE EXCEPTION 'missing commission request-hash uniqueness';
  END IF;
END $$;

BEGIN;
INSERT INTO wlt_jrn036_commission_policy_versions (
  policy_id, version, commission_type, source_type, beneficiary_actor_type,
  calculation_type, fixed_amount_minor_units, basis_points,
  minimum_amount_minor_units, maximum_amount_minor_units,
  currency, status, change_reason, updated_by_actor_id
) VALUES (
  'jrn036-invariant-policy-a', 1, 'ci_fee', 'ci_source', 'field',
  'fixed', 100, 0, 100, 100, 'YER', 'active', 'database invariant test', 'ci'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO wlt_jrn036_commission_policy_versions (
      policy_id, version, commission_type, source_type, beneficiary_actor_type,
      calculation_type, fixed_amount_minor_units, basis_points,
      minimum_amount_minor_units, maximum_amount_minor_units,
      currency, status, change_reason, updated_by_actor_id
    ) VALUES (
      'jrn036-invariant-policy-b', 1, 'ci_fee', 'ci_source', 'field',
      'fixed', 100, 0, 100, 100, 'YER', 'active', 'must conflict', 'ci'
    );
    RAISE EXCEPTION 'duplicate active policy was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;
END $$;
ROLLBACK;

DO $$
BEGIN
  BEGIN
    INSERT INTO wlt_jrn036_commission_policy_versions (
      policy_id, version, commission_type, source_type, beneficiary_actor_type,
      calculation_type, fixed_amount_minor_units, basis_points,
      minimum_amount_minor_units, maximum_amount_minor_units,
      currency, status, change_reason, updated_by_actor_id
    ) VALUES (
      'jrn036-invalid-formula', 1, 'bad_fee', 'bad_source', 'captain',
      'fixed', 0, 0, 0, NULL, 'YER', 'inactive', 'must fail', 'ci'
    );
    RAISE EXCEPTION 'invalid fixed policy formula was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END $$;

SELECT 'JRN-036 PostgreSQL invariants passed' AS result;
