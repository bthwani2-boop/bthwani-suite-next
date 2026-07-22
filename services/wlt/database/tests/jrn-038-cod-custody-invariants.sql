\set ON_ERROR_STOP on

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wlt_cod_custody_evidence'
  ) THEN missing := array_append(missing, 'wlt_cod_custody_evidence'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wlt_cod_reconciliation_cases'
  ) THEN missing := array_append(missing, 'wlt_cod_reconciliation_cases'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'wlt_cod_custody_evidence'
      AND constraint_name = 'wlt_cod_custody_evidence_difference_chk'
      AND constraint_type = 'CHECK'
  ) THEN missing := array_append(missing, 'custody expected-versus-actual difference check'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'wlt_cod_custody_evidence'
      AND constraint_name = 'wlt_cod_custody_evidence_proof_chk'
      AND constraint_type = 'CHECK'
  ) THEN missing := array_append(missing, 'custody proof check'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'wlt_cod_reconciliation_cases'
      AND constraint_name = 'wlt_cod_reconciliation_non_zero_chk'
      AND constraint_type = 'CHECK'
  ) THEN missing := array_append(missing, 'non-zero reconciliation variance check'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'wlt_cod_custody_evidence'
      AND indexdef ILIKE '%UNIQUE%cod_record_id%event_type%'
  ) THEN missing := array_append(missing, 'one custody evidence event per COD record'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wlt_ledger_accounts_type_chk'
      AND pg_get_constraintdef(oid) LIKE '%cash_in_transit%'
      AND pg_get_constraintdef(oid) LIKE '%cash_variance%'
  ) THEN missing := array_append(missing, 'COD cash-in-transit and variance ledger accounts'); END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'JRN-038 invariant failure: %', array_to_string(missing, ', ');
  END IF;
END
$$;

DO $$
DECLARE
  record_id text;
BEGIN
  INSERT INTO wlt_cod_records
    (order_id, payment_session_id, partner_id, captain_id, collector_type, collector_id,
     amount_minor_units, currency, status)
  VALUES
    ('order-jrn038-invariant', 'payment-session-jrn038-invariant', 'partner-jrn038',
     'captain-jrn038', 'captain', 'captain-jrn038', 10000, 'YER', 'pending_collection')
  RETURNING id INTO record_id;

  BEGIN
    INSERT INTO wlt_cod_custody_evidence
      (cod_record_id, event_type, expected_amount_minor_units, actual_amount_minor_units,
       difference_minor_units, currency, proof_reference, actor_id, actor_type,
       correlation_id, idempotency_key, ledger_transaction_id)
    VALUES
      (record_id, 'collection', 10000, 9500, 0, 'YER', 'proof-invalid-difference',
       'captain-jrn038', 'captain', 'corr-jrn038-invalid', 'idem-jrn038-invalid', 'ledger-invalid');
    RAISE EXCEPTION 'JRN-038 invariant failure: invalid difference was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO wlt_cod_custody_evidence
      (cod_record_id, event_type, expected_amount_minor_units, actual_amount_minor_units,
       difference_minor_units, currency, proof_reference, actor_id, actor_type,
       correlation_id, idempotency_key, ledger_transaction_id)
    VALUES
      (record_id, 'collection', 10000, 9500, -500, 'YER', 'x',
       'captain-jrn038', 'captain', 'corr-jrn038-proof', 'idem-jrn038-proof', 'ledger-proof');
    RAISE EXCEPTION 'JRN-038 invariant failure: weak proof reference was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$$;

SELECT 'JRN-038 COD custody invariants passed' AS result;
