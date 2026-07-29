\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_client_id text := 'test-address-retention-' || replace(gen_random_uuid()::text, '-', '');
  v_deleted integer;
  v_count integer;
  v_invalid_limit_blocked boolean := false;
BEGIN
  INSERT INTO dsh_client_address_mutation_receipts (
    client_id, idempotency_key, operation, request_fingerprint,
    address_id, result_version, result_deleted, expires_at
  ) VALUES
    (v_client_id, 'address-update:expired:v1', 'update', repeat('a', 64), 'addr-expired', 2, false, NOW() - INTERVAL '1 minute'),
    (v_client_id, 'address-update:fresh:v1', 'update', repeat('b', 64), 'addr-fresh', 2, false, NOW() + INTERVAL '30 days');

  SELECT dsh_purge_expired_client_address_mutation_receipts(100) INTO v_deleted;
  IF v_deleted < 1 THEN
    RAISE EXCEPTION 'expired mutation receipt was not purged';
  END IF;

  SELECT count(*) INTO v_count
  FROM dsh_client_address_mutation_receipts
  WHERE client_id = v_client_id
    AND idempotency_key = 'address-update:expired:v1';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'expired mutation receipt still exists';
  END IF;

  SELECT count(*) INTO v_count
  FROM dsh_client_address_mutation_receipts
  WHERE client_id = v_client_id
    AND idempotency_key = 'address-update:fresh:v1';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'fresh mutation receipt was purged';
  END IF;

  BEGIN
    PERFORM dsh_purge_expired_client_address_mutation_receipts(10001);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_invalid_limit_blocked := true;
  END;
  IF NOT v_invalid_limit_blocked THEN
    RAISE EXCEPTION 'invalid purge limit was accepted';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = current_schema()
    AND indexname = 'idx_dsh_client_address_mutation_receipts_expiry';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'mutation receipt expiry index is missing';
  END IF;
END $$;

ROLLBACK;
