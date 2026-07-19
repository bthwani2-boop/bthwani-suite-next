\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_count integer;
  v_remaining integer;
  v_index integer;
BEGIN
  UPDATE dsh_client_address_privacy_policy
     SET enabled = TRUE,
         retention_days = 0,
         batch_limit = 2,
         version = version + 1,
         updated_by = 'privacy-batch-default-test',
         updated_at = NOW()
   WHERE id = 1;

  FOR v_index IN 1..3 LOOP
    INSERT INTO dsh_client_addresses (
      client_id,
      label,
      recipient_name,
      phone_e164,
      address_line,
      service_area_code,
      create_idempotency_key
    ) VALUES (
      'privacy-batch-client-' || v_suffix || '-' || v_index,
      'home',
      'Batch Subject',
      '+96775555555' || v_index,
      'Batch policy address ' || v_index,
      'sanaa',
      'privacy-batch-' || v_suffix || '-' || v_index
    );
  END LOOP;

  UPDATE dsh_client_addresses
     SET deleted_at = NOW(),
         updated_at = NOW(),
         version = version + 1
   WHERE client_id LIKE 'privacy-batch-client-' || v_suffix || '-%';

  SELECT dsh_anonymize_expired_client_addresses(
    0,
    'privacy-batch-default-test',
    'privacy-batch-default-correlation'
  ) INTO v_count;

  IF v_count <> 2 THEN
    RAISE EXCEPTION 'zero worker limit did not use policy batch_limit=2; got %', v_count;
  END IF;

  SELECT count(*)
    INTO v_remaining
    FROM dsh_client_addresses
   WHERE client_id LIKE 'privacy-batch-client-' || v_suffix || '-%'
     AND deleted_at IS NOT NULL
     AND pii_anonymized_at IS NULL;

  IF v_remaining <> 1 THEN
    RAISE EXCEPTION 'expected one due address after governed batch, got %', v_remaining;
  END IF;
END $$;

ROLLBACK;
