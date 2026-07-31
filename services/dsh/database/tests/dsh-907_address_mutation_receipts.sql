\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_client_id text := 'test-address-receipt-' || replace(gen_random_uuid()::text, '-', '');
  v_key text := 'address-update:test:v1';
  v_duplicate_blocked boolean := false;
  v_shape_blocked boolean := false;
  v_count integer;
BEGIN
  INSERT INTO dsh_client_address_mutation_receipts (
    client_id,
    idempotency_key,
    operation,
    request_fingerprint,
    address_id,
    result_version,
    result_deleted,
    correlation_id
  ) VALUES (
    v_client_id,
    v_key,
    'update',
    repeat('a', 64),
    'addr_test_receipt',
    2,
    false,
    'corr-test-address-receipt'
  );

  BEGIN
    INSERT INTO dsh_client_address_mutation_receipts (
      client_id,
      idempotency_key,
      operation,
      request_fingerprint,
      address_id,
      result_version,
      result_deleted
    ) VALUES (
      v_client_id,
      v_key,
      'delete',
      repeat('b', 64),
      'addr_other',
      3,
      true
    );
  EXCEPTION WHEN unique_violation THEN
    v_duplicate_blocked := true;
  END;

  IF NOT v_duplicate_blocked THEN
    RAISE EXCEPTION 'client-scoped idempotency-key reuse was not rejected';
  END IF;

  BEGIN
    INSERT INTO dsh_client_address_mutation_receipts (
      client_id,
      idempotency_key,
      operation,
      request_fingerprint,
      address_id,
      result_version,
      result_deleted
    ) VALUES (
      v_client_id,
      'address-default:test:v2',
      'set_default',
      repeat('c', 64),
      'addr_test_receipt',
      3,
      true
    );
  EXCEPTION WHEN check_violation THEN
    v_shape_blocked := true;
  END;

  IF NOT v_shape_blocked THEN
    RAISE EXCEPTION 'non-delete receipt accepted result_deleted=true';
  END IF;

  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'dsh_client_address_mutation_receipts'
    AND column_name IN (
      'recipient_name',
      'phone_e164',
      'address_line',
      'service_area_code',
      'building',
      'floor',
      'unit',
      'delivery_instructions',
      'latitude',
      'longitude',
      'response_body'
    );
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'mutation receipt schema contains address PII or response body';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = current_schema()
    AND indexname = 'idx_dsh_client_address_mutation_receipts_address';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'mutation receipt address lookup index is missing';
  END IF;
END $$;

ROLLBACK;
