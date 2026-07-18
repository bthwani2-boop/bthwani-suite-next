\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_client_id text := 'client-pii-' || v_suffix;
  v_deleted_id text;
  v_active_id text;
  v_count integer;
  v_purge_after timestamptz;
BEGIN
  UPDATE dsh_client_address_privacy_policy
     SET enabled = TRUE,
         retention_days = 0,
         batch_limit = 100,
         version = version + 1,
         updated_by = 'pii-invariant-test',
         updated_at = NOW()
   WHERE id = 1;

  INSERT INTO dsh_client_addresses (
    client_id,
    label,
    recipient_name,
    phone_e164,
    address_line,
    service_area_code,
    latitude,
    longitude,
    create_idempotency_key
  ) VALUES (
    v_client_id,
    'deleted address',
    'Sensitive Name',
    '+967711111111',
    'Sensitive delivery address',
    'sanaa',
    15.35,
    44.20,
    'pii-delete-' || v_suffix
  ) RETURNING id INTO v_deleted_id;

  INSERT INTO dsh_client_addresses (
    client_id,
    label,
    recipient_name,
    phone_e164,
    address_line,
    service_area_code,
    latitude,
    longitude,
    create_idempotency_key
  ) VALUES (
    v_client_id,
    'active address',
    'Active Name',
    '+967722222222',
    'Active delivery address',
    'sanaa',
    15.36,
    44.21,
    'pii-active-' || v_suffix
  ) RETURNING id INTO v_active_id;

  UPDATE dsh_client_addresses
     SET deleted_at = NOW(),
         updated_at = NOW(),
         version = version + 1
   WHERE id = v_deleted_id;

  SELECT pii_purge_after
    INTO v_purge_after
    FROM dsh_client_addresses
   WHERE id = v_deleted_id;
  IF v_purge_after IS NULL OR v_purge_after > NOW() + interval '1 minute' THEN
    RAISE EXCEPTION 'deleted address was not scheduled for immediate PII purge';
  END IF;

  SELECT dsh_anonymize_expired_client_addresses(
    100,
    'pii-invariant-test',
    'pii-invariant-correlation'
  ) INTO v_count;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'expected one anonymized address, got %', v_count;
  END IF;

  SELECT count(*)
    INTO v_count
    FROM dsh_client_addresses
   WHERE id = v_deleted_id
     AND recipient_name = 'deleted-user'
     AND phone_e164 = '+96700000000'
     AND address_line = 'deleted-address'
     AND service_area_code = 'deleted'
     AND building IS NULL
     AND floor IS NULL
     AND unit IS NULL
     AND delivery_instructions IS NULL
     AND latitude IS NULL
     AND longitude IS NULL
     AND pii_anonymized_at IS NOT NULL;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'deleted address PII was not fully anonymized';
  END IF;

  SELECT count(*)
    INTO v_count
    FROM dsh_client_addresses
   WHERE id = v_active_id
     AND deleted_at IS NULL
     AND pii_anonymized_at IS NULL
     AND recipient_name = 'Active Name'
     AND phone_e164 = '+967722222222'
     AND latitude = 15.36
     AND longitude = 44.21;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'active address was modified by privacy anonymization';
  END IF;

  SELECT count(*)
    INTO v_count
    FROM dsh_client_address_privacy_events
   WHERE address_id = v_deleted_id
     AND action = 'retention_scheduled';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'retention scheduling event is missing';
  END IF;

  SELECT count(*)
    INTO v_count
    FROM dsh_client_address_privacy_events
   WHERE address_id = v_deleted_id
     AND action = 'anonymized'
     AND actor_id = 'pii-invariant-test';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'anonymization audit event is missing';
  END IF;
END $$;

ROLLBACK;
