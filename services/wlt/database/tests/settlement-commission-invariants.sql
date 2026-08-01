\set ON_ERROR_STOP on

DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'wlt_settlement_requests',
    'wlt_settlement_source_evidence',
    'wlt_settlement_policy_versions',
    'wlt_commission_policy_versions',
    'wlt_commission_evidence',
    'wlt_commission_adjustments',
    'wlt_mutation_receipts'
  ] LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'missing  table %', required_table;
    END IF;
  END LOOP;

  -- wlt-902 renames wlt_audit_events to wlt_finance_audit_events on any
  -- database new enough to have it; accept either name so this contract
  -- does not go stale after that rename.
  IF to_regclass('public.wlt_audit_events') IS NULL
     AND to_regclass('public.wlt_finance_audit_events') IS NULL THEN
    RAISE EXCEPTION 'missing  table wlt_audit_events (or its wlt-902 rename wlt_finance_audit_events)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wlt_settlement_refund_basis_chk'
  ) THEN
    RAISE EXCEPTION 'missing refund/basis arithmetic constraint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      -- wlt-107 scoped the single-active-policy invariant by operator context; the
      -- unscoped wlt_commission_policy_active_uidx no longer exists.
      AND indexname = 'wlt_commission_policy_active_operatorcontext_uidx'
      AND indexdef LIKE '%WHERE (status = ''active''::text)%'
  ) THEN
    RAISE EXCEPTION 'missing one-active-commission-policy-per-operator-context invariant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      -- Request-hash uniqueness moved onto the commission evidence table and is
      -- scoped by operator context; the unscoped wlt_commission_request_hash_uidx
      -- no longer exists.
      AND indexname = 'wlt_commission_evidence_operatorcontext_request_hash_uq'
      AND indexdef LIKE 'CREATE UNIQUE INDEX%'
  ) THEN
    RAISE EXCEPTION 'missing commission request-hash uniqueness per operator context';
  END IF;

  -- Adjustment idempotency became an operator-context-scoped unique INDEX in
  -- wlt-107; the old table-level unique CONSTRAINT on idempotency_key is gone.
  IF to_regclass('public.wlt_commission_adjustments_operator_context_idempotency_uq') IS NULL THEN
    RAISE EXCEPTION 'missing adjustment idempotency uniqueness per operator context';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wlt_commission_adjustments_request_hash_key'
  ) THEN
    RAISE EXCEPTION 'adjustment request hash must not be globally unique';
  END IF;

  IF to_regclass('public.wlt_commission_adjustments_operatorcontext_request_hash_idx') IS NULL THEN
    RAISE EXCEPTION 'missing non-unique adjustment request-hash diagnostics index';
  END IF;

  IF to_regclass('public.wlt_commission_adjustments_operatorcontext_commission_created_i') IS NULL THEN
    RAISE EXCEPTION 'missing adjustment history ordering index';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wlt_mutation_receipts_pkey'
      AND contype = 'p'
  ) THEN
    RAISE EXCEPTION 'mutation receipt idempotency key must be the primary key';
  END IF;

  IF to_regclass('public.wlt_mutation_receipts_operatorcontext_aggregate_idx') IS NULL THEN
    RAISE EXCEPTION 'missing mutation receipt aggregate index';
  END IF;

  IF to_regclass('public.wlt_mutation_receipts_operatorcontext_request_hash_idx') IS NULL THEN
    RAISE EXCEPTION 'missing mutation receipt request-hash diagnostics index';
  END IF;
END $$;

BEGIN;
INSERT INTO wlt_commission_policy_versions (
  operator_context_id, policy_id, version, commission_type, source_type, beneficiary_actor_type,
  calculation_type, fixed_amount_minor_units, basis_points,
  minimum_amount_minor_units, maximum_amount_minor_units,
  currency, status, change_reason, updated_by_actor_id
) VALUES (
  'ctx-invariant-probe', 'invariant-policy-a', 1, 'ci_fee', 'ci_source', 'field',
  'fixed', 100, 0, 100, 100, 'YER', 'active', 'database invariant test', 'ci'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO wlt_commission_policy_versions (
      operator_context_id, policy_id, version, commission_type, source_type, beneficiary_actor_type,
      calculation_type, fixed_amount_minor_units, basis_points,
      minimum_amount_minor_units, maximum_amount_minor_units,
      currency, status, change_reason, updated_by_actor_id
    ) VALUES (
      'ctx-invariant-probe', 'invariant-policy-b', 1, 'ci_fee', 'ci_source', 'field',
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
    INSERT INTO wlt_commission_policy_versions (
      operator_context_id, policy_id, version, commission_type, source_type, beneficiary_actor_type,
      calculation_type, fixed_amount_minor_units, basis_points,
      minimum_amount_minor_units, maximum_amount_minor_units,
      currency, status, change_reason, updated_by_actor_id
    ) VALUES (
      'ctx-invariant-probe', 'invalid-formula', 1, 'bad_fee', 'bad_source', 'captain',
      'fixed', 0, 0, 0, NULL, 'YER', 'inactive', 'must fail', 'ci'
    );
    RAISE EXCEPTION 'invalid fixed policy formula was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END $$;

SELECT ' PostgreSQL invariants passed' AS result;
