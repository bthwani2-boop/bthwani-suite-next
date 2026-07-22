-- JRN-011 payment projection reconciliation invariants.
-- Run after dsh-905 in an isolated verification database.
BEGIN;

DO $$
DECLARE
  missing TEXT[] := ARRAY[]::TEXT[];
  function_sql TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='dsh_orders'
      AND column_name='payment_projection_source_updated_at'
  ) THEN missing := array_append(missing, 'source projection timestamp'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='dsh_orders'
      AND column_name='payment_projection_reconciled_at'
  ) THEN missing := array_append(missing, 'projection reconciliation timestamp'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name='dsh_order_payment_projection_reconciliation'
  ) THEN missing := array_append(missing, 'payment projection reconciliation table'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename='dsh_order_payment_projection_reconciliation'
      AND indexdef ILIKE '%UNIQUE%tenant_id%wlt_payment_session_id%'
  ) THEN missing := array_append(missing, 'tenant WLT session uniqueness'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_dsh_jrn011_schedule_payment_projection'
      AND NOT tgisinternal
  ) THEN missing := array_append(missing, 'order projection scheduling trigger'); END IF;

  SELECT pg_get_functiondef(p.oid)
  INTO function_sql
  FROM pg_proc p
  WHERE p.proname='dsh_jrn011_apply_order_truth'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF function_sql IS NULL OR function_sql NOT ILIKE '%FROM 1 FOR 12%' THEN
    missing := array_append(missing, 'twelve-character order number suffix');
  END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'JRN-011 dsh-905 invariant failure: %', array_to_string(missing, ', ');
  END IF;
END $$;

ROLLBACK;
