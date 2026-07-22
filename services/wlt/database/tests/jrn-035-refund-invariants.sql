\set ON_ERROR_STOP on

DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(required.column_name ORDER BY required.column_name)
  INTO missing_columns
  FROM (VALUES
    ('tenant_id'),
    ('requested_by_operator_id'),
    ('approved_by_operator_id'),
    ('rejected_by_operator_id'),
    ('eligibility_reference'),
    ('idempotency_key'),
    ('provider_idempotency_key'),
    ('provider_reference'),
    ('provider_status'),
    ('provider_error'),
    ('provider_attempted_at'),
    ('reconciliation_case_id'),
    ('version')
  ) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns actual
    WHERE actual.table_schema = 'public'
      AND actual.table_name = 'wlt_refunds'
      AND actual.column_name = required.column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'JRN-035 missing wlt_refunds columns: %', missing_columns;
  END IF;
END $$;

DO $$
DECLARE
  status_definition TEXT;
  maker_checker_definition TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO status_definition
  FROM pg_constraint
  WHERE conrelid = 'wlt_refunds'::regclass
    AND conname = 'wlt_refunds_status_chk';

  IF status_definition IS NULL
     OR status_definition NOT LIKE '%provider_unknown%'
     OR status_definition NOT LIKE '%processing%'
     OR status_definition NOT LIKE '%completed%' THEN
    RAISE EXCEPTION 'JRN-035 refund status constraint is incomplete: %', status_definition;
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO maker_checker_definition
  FROM pg_constraint
  WHERE conrelid = 'wlt_refunds'::regclass
    AND conname = 'wlt_refunds_maker_checker_chk';

  IF maker_checker_definition IS NULL
     OR maker_checker_definition NOT LIKE '%approved_by_operator_id%requested_by_operator_id%'
     OR maker_checker_definition NOT LIKE '%rejected_by_operator_id%requested_by_operator_id%' THEN
    RAISE EXCEPTION 'JRN-035 maker-checker constraint is missing or incomplete: %', maker_checker_definition;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.wlt_refund_audit_events') IS NULL THEN
    RAISE EXCEPTION 'JRN-035 refund audit table is missing';
  END IF;
  IF to_regclass('public.wlt_refunds_session_idempotency_idx') IS NULL THEN
    RAISE EXCEPTION 'JRN-035 refund creation idempotency index is missing';
  END IF;
  IF to_regclass('public.wlt_refunds_provider_unknown_idx') IS NULL THEN
    RAISE EXCEPTION 'JRN-035 provider-unknown reconciliation index is missing';
  END IF;
  IF to_regclass('public.wlt_dsh_outbox_events_refund_event_idx') IS NULL THEN
    RAISE EXCEPTION 'JRN-035 durable refund readback index is missing';
  END IF;
  IF to_regclass('public.wlt_refund_operation_receipts') IS NULL THEN
    RAISE EXCEPTION 'JRN-035 mutation idempotency receipt table is missing';
  END IF;
  IF to_regclass('public.wlt_refund_operation_receipts_identity_uq') IS NULL THEN
    RAISE EXCEPTION 'JRN-035 mutation idempotency identity index is missing';
  END IF;
END $$;

DO $$
DECLARE
  operation_definition TEXT;
  receipt_operation_definition TEXT;
  receipt_status_definition TEXT;
  receipt_response_definition TEXT;
  refund_ref_definition TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO operation_definition
  FROM pg_constraint
  WHERE conrelid = 'wlt_reconciliation_cases'::regclass
    AND conname = 'wlt_reconciliation_cases_operation_chk';
  IF operation_definition IS NULL OR operation_definition NOT LIKE '%refund%' THEN
    RAISE EXCEPTION 'JRN-035 reconciliation operation does not include refund: %', operation_definition;
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO receipt_operation_definition
  FROM pg_constraint
  WHERE conrelid = 'wlt_refund_operation_receipts'::regclass
    AND conname = 'wlt_refund_operation_receipts_operation_chk';
  IF receipt_operation_definition IS NULL
     OR receipt_operation_definition NOT LIKE '%create%'
     OR receipt_operation_definition NOT LIKE '%approve%'
     OR receipt_operation_definition NOT LIKE '%reject%'
     OR receipt_operation_definition NOT LIKE '%complete%'
     OR receipt_operation_definition NOT LIKE '%reconcile%' THEN
    RAISE EXCEPTION 'JRN-035 receipt operations are incomplete: %', receipt_operation_definition;
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO receipt_status_definition
  FROM pg_constraint
  WHERE conrelid = 'wlt_refund_operation_receipts'::regclass
    AND conname = 'wlt_refund_operation_receipts_status_chk';
  IF receipt_status_definition IS NULL
     OR receipt_status_definition NOT LIKE '%processing%'
     OR receipt_status_definition NOT LIKE '%completed%' THEN
    RAISE EXCEPTION 'JRN-035 receipt lifecycle is incomplete: %', receipt_status_definition;
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO receipt_response_definition
  FROM pg_constraint
  WHERE conrelid = 'wlt_refund_operation_receipts'::regclass
    AND conname = 'wlt_refund_operation_receipts_response_chk';
  IF receipt_response_definition IS NULL
     OR receipt_response_definition NOT LIKE '%response_status%'
     OR receipt_response_definition NOT LIKE '%response_body%'
     OR receipt_response_definition NOT LIKE '%completed_at%' THEN
    RAISE EXCEPTION 'JRN-035 completed receipt evidence constraint is incomplete: %', receipt_response_definition;
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO refund_ref_definition
  FROM pg_constraint
  WHERE conrelid = 'wlt_refund_status_refs'::regclass
    AND conname = 'wlt_refund_status_refs_status_chk';
  IF refund_ref_definition IS NULL
     OR refund_ref_definition NOT LIKE '%partially_refunded%'
     OR refund_ref_definition NOT LIKE '%provider_unknown%' THEN
    RAISE EXCEPTION 'JRN-035 refund reference states are incomplete: %', refund_ref_definition;
  END IF;
END $$;

SELECT 'JRN-035 refund database invariants passed' AS result;
