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
    'test-area', 1, 'Invariant fixture coverage',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[44.10,15.25],[44.30,15.25],[44.30,15.45],[44.10,15.45],[44.10,15.25]]]}'), 4326),
    TRUE, 100, 4326, 'priority_then_code', NOW() - interval '1 day', NULL,
    'db-invariant-fixture', 'system', 'clean-install invariant fixture area', NULL, NOW()
  ) ON CONFLICT (service_area_code, version) DO NOTHING;
END $$;

DO $$
DECLARE
  v_client_id text := 'test-address-dedupe-' || replace(gen_random_uuid()::text, '-', '');
  v_first_id text;
  v_second_id text;
  v_insert_blocked boolean := false;
  v_update_blocked boolean := false;
  v_count integer;
BEGIN
  INSERT INTO dsh_client_addresses (
    client_id,
    label,
    recipient_name,
    phone_e164,
    address_line,
    service_area_code,
    building,
    floor,
    unit,
    delivery_instructions,
    latitude,
    longitude,
    is_default,
    create_idempotency_key
  ) VALUES (
    v_client_id,
    'المنزل',
    'مستلم التكرار',
    '+967700000091',
    'شارع الاختبار، جوار المعلم',
    'test-area',
    '12',
    '3',
    '7',
    'اتصل عند الوصول',
    15.369445,
    44.191006,
    true,
    'address-dedupe:first'
  ) RETURNING id INTO v_first_id;

  BEGIN
    INSERT INTO dsh_client_addresses (
      client_id,
      label,
      recipient_name,
      phone_e164,
      address_line,
      service_area_code,
      building,
      floor,
      unit,
      delivery_instructions,
      latitude,
      longitude,
      is_default,
      create_idempotency_key
    ) VALUES (
      v_client_id,
      'اسم مختلف لنفس العنوان',
      '  مستلم التكرار  ',
      '+967700000091',
      '  شارع الاختبار، جوار المعلم  ',
      'TEST-AREA',
      '12',
      '3',
      '7',
      'اتصل عند الوصول',
      15.369445,
      44.191006,
      false,
      'address-dedupe:second-key'
    );
  EXCEPTION WHEN unique_violation THEN
    v_insert_blocked := true;
  END;

  IF NOT v_insert_blocked THEN
    RAISE EXCEPTION 'logical duplicate insert was not rejected';
  END IF;

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
    is_default,
    create_idempotency_key
  ) VALUES (
    v_client_id,
    'العمل',
    'مستلم آخر',
    '+967700000092',
    'عنوان مختلف للاختبار',
    'test-area',
    'البوابة الرئيسية',
    15.371,
    44.195,
    false,
    'address-dedupe:distinct'
  ) RETURNING id INTO v_second_id;

  BEGIN
    UPDATE dsh_client_addresses
    SET recipient_name = 'مستلم التكرار',
        phone_e164 = '+967700000091',
        address_line = 'شارع الاختبار، جوار المعلم',
        service_area_code = 'test-area',
        building = '12',
        floor = '3',
        unit = '7',
        delivery_instructions = 'اتصل عند الوصول',
        latitude = 15.369445,
        longitude = 44.191006
    WHERE id = v_second_id;
  EXCEPTION WHEN unique_violation THEN
    v_update_blocked := true;
  END;

  IF NOT v_update_blocked THEN
    RAISE EXCEPTION 'logical duplicate update was not rejected';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = current_schema()
    AND indexname = 'uq_dsh_client_addresses_active_fingerprint';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'active address fingerprint unique index is missing';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_trigger
  WHERE tgname = 'trg_dsh_client_address_fingerprint'
    AND NOT tgisinternal;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'address fingerprint trigger is missing';
  END IF;

  IF v_first_id IS NULL OR v_second_id IS NULL THEN
    RAISE EXCEPTION 'test setup did not persist both canonical addresses';
  END IF;
END $$;

ROLLBACK;
