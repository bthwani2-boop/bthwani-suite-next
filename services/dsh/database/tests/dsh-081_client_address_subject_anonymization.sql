\set ON_ERROR_STOP on

BEGIN;

-- Clean-install invariant fixture: the geofence binding (dsh-906/dsh-981)
-- requires every live address to resolve inside an active service-area
-- version, so the proof seeds its own coverage area before inserting.
DO $$
BEGIN
  INSERT INTO dsh_service_area_versions (
    service_area_code, version, display_name, polygon, active, priority, srid,
    overlap_policy, effective_from, expires_at, actor_id, actor_surface, reason,
    correlation_id, created_at
  ) VALUES (
    'sanaa', 1, 'Invariant fixture coverage',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[44.10,15.25],[44.30,15.25],[44.30,15.45],[44.10,15.45],[44.10,15.25]]]}'), 4326),
    TRUE, 100, 4326, 'priority_then_code', NOW() - interval '1 day', NULL,
    'db-invariant-fixture', 'system', 'clean-install invariant fixture area', NULL, NOW()
  ) ON CONFLICT (service_area_code, version) DO NOTHING;
END $$;

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
