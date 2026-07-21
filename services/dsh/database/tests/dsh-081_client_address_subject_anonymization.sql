\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_original_client_id text := 'client-subject-pii-' || v_suffix;
  v_address_id text;
  v_anonymized_client_id text;
  v_count integer;
BEGIN
  UPDATE dsh_client_address_privacy_policy
     SET enabled = TRUE,
         retention_days = 0,
         batch_limit = 100,
         version = version + 1,
         updated_by = 'subject-anonymization-test',
         updated_at = NOW()
   WHERE id = 1;

  INSERT INTO dsh_client_addresses (
    client_id,
    label,
    recipient_name,
    phone_e164,
    address_line,
    service_area_code,
    delivery_instructions,
    latitude,
    longitude,
    create_idempotency_key
  ) VALUES (
    v_original_client_id,
    'home',
    'Sensitive Subject',
    '+967733333333',
    'Sensitive subject address',
    'sanaa',
    'Sensitive instructions',
    15.37,
    44.22,
    'subject-delete-' || v_suffix
  ) RETURNING id INTO v_address_id;

  INSERT INTO dsh_client_address_events (
    address_id,
    client_id,
    action,
    version,
    correlation_id,
    metadata
  ) VALUES (
    v_address_id,
    v_original_client_id,
    'created',
    1,
    'sensitive-correlation-' || v_suffix,
    jsonb_build_object(
      'recipientName', 'Sensitive Subject',
      'addressLine', 'Sensitive subject address'
    )
  );

  UPDATE dsh_client_addresses
     SET deleted_at = NOW(),
         updated_at = NOW(),
         version = version + 1
   WHERE id = v_address_id;

  PERFORM dsh_anonymize_expired_client_addresses(
    100,
    'subject-anonymization-test',
    'subject-anonymization-correlation'
  );

  SELECT client_id
    INTO v_anonymized_client_id
    FROM dsh_client_addresses
   WHERE id = v_address_id;

  IF v_anonymized_client_id = v_original_client_id OR
     v_anonymized_client_id NOT LIKE 'deleted:%' THEN
    RAISE EXCEPTION 'deleted address still retains original client subject link';
  END IF;

  SELECT count(*)
    INTO v_count
    FROM dsh_client_addresses
   WHERE id = v_address_id
     AND label = 'deleted'
     AND recipient_name = 'deleted-user'
     AND phone_e164 = '+96700000000'
     AND address_line = 'deleted-address'
     AND service_area_code = 'deleted'
     AND delivery_instructions IS NULL
     AND latitude IS NULL
     AND longitude IS NULL
     AND pii_anonymized_at IS NOT NULL;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'deleted address row was not fully anonymized';
  END IF;

  SELECT count(*)
    INTO v_count
    FROM dsh_client_address_events
   WHERE address_id = v_address_id
     AND client_id = v_anonymized_client_id
     AND correlation_id IS NULL
     AND metadata = jsonb_build_object('piiAnonymized', TRUE);
  IF v_count < 1 THEN
    RAISE EXCEPTION 'historical address event PII was not scrubbed';
  END IF;

  SELECT count(*)
    INTO v_count
    FROM dsh_client_address_events
   WHERE address_id = v_address_id
     AND (
       client_id = v_original_client_id OR
       correlation_id IS NOT NULL OR
       metadata::text ILIKE '%Sensitive%'
     );
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'address events retain client-linked or sensitive metadata';
  END IF;
END $$;

ROLLBACK;
