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
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wlt_cod_reconciliation_audit_events'
  ) THEN missing := array_append(missing, 'wlt_cod_reconciliation_audit_events'); END IF;

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

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'wlt_jrn038_cod_custody_evidence_immutable_trigger' AND NOT tgisinternal
  ) THEN missing := array_append(missing, 'custody evidence immutability trigger'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'wlt_jrn038_cod_reconciliation_audit_trigger' AND NOT tgisinternal
  ) THEN missing := array_append(missing, 'reconciliation audit capture trigger'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'wlt_jrn038_cod_reconciliation_audit_immutable_trigger' AND NOT tgisinternal
  ) THEN missing := array_append(missing, 'reconciliation audit immutability trigger'); END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'JRN-038 invariant failure: %', array_to_string(missing, ', ');
  END IF;
END
$$;

DO $$
DECLARE
  record_id text;
  evidence_id text;
  case_id text;
  audit_count integer;
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

  INSERT INTO wlt_cod_custody_evidence
    (cod_record_id, event_type, expected_amount_minor_units, actual_amount_minor_units,
     difference_minor_units, currency, proof_reference, actor_id, actor_type,
     correlation_id, idempotency_key, ledger_transaction_id)
  VALUES
    (record_id, 'collection', 10000, 9500, -500, 'YER', 'proof-jrn038-valid',
     'captain-jrn038', 'captain', 'corr-jrn038-valid', 'idem-jrn038-valid', 'ledger-jrn038-valid')
  RETURNING id INTO evidence_id;

  BEGIN
    UPDATE wlt_cod_custody_evidence
    SET note = 'tampered'
    WHERE id = evidence_id;
    RAISE EXCEPTION 'JRN-038 invariant failure: custody evidence mutation was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM = 'JRN-038 invariant failure: custody evidence mutation was accepted' THEN
        RAISE;
      END IF;
  END;

  INSERT INTO wlt_cod_reconciliation_cases
    (cod_record_id, custody_evidence_id, expected_amount_minor_units,
     actual_amount_minor_units, difference_minor_units, currency)
  VALUES
    (record_id, evidence_id, 10000, 9500, -500, 'YER')
  RETURNING id INTO case_id;

  SELECT count(*) INTO audit_count
  FROM wlt_cod_reconciliation_audit_events
  WHERE reconciliation_case_id = case_id AND event_type = 'opened';
  IF audit_count <> 1 THEN
    RAISE EXCEPTION 'JRN-038 invariant failure: case opening audit event missing';
  END IF;

  UPDATE wlt_cod_reconciliation_cases
  SET status = 'investigating', assigned_to_operator_id = 'operator-jrn038',
      assigned_at = now(), investigation_note = 'count and verify proof', updated_at = now()
  WHERE id = case_id;

  UPDATE wlt_cod_reconciliation_cases
  SET status = 'resolved', resolved_by_operator_id = 'operator-jrn038',
      resolution_action = 'collector_recovery', resolution_note = 'recovery recorded',
      resolved_at = now(), updated_at = now()
  WHERE id = case_id;

  SELECT count(*) INTO audit_count
  FROM wlt_cod_reconciliation_audit_events
  WHERE reconciliation_case_id = case_id;
  IF audit_count <> 3 THEN
    RAISE EXCEPTION 'JRN-038 invariant failure: expected 3 audit events, found %', audit_count;
  END IF;

  BEGIN
    UPDATE wlt_cod_reconciliation_audit_events
    SET metadata = '{}'::jsonb
    WHERE reconciliation_case_id = case_id;
    RAISE EXCEPTION 'JRN-038 invariant failure: audit event mutation was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM = 'JRN-038 invariant failure: audit event mutation was accepted' THEN
        RAISE;
      END IF;
  END;
END
$$;

SELECT 'JRN-038 COD custody invariants passed' AS result;
