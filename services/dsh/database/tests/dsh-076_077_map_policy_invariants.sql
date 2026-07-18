\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_zone_id text := 'zone_test_' || v_suffix;
  v_area_code text := 'area_' || v_suffix;
  v_duplicate boolean := false;
  v_invalid_polygon boolean := false;
  v_count integer;
BEGIN
  INSERT INTO dsh_service_area_geofences (
    service_area_code,
    display_name,
    polygon,
    active,
    priority
  ) VALUES (
    v_area_code,
    'منطقة اختبار',
    '[[44.10,15.30],[44.20,15.30],[44.20,15.40]]'::jsonb,
    true,
    100
  );

  BEGIN
    INSERT INTO dsh_service_area_geofences (
      service_area_code,
      display_name,
      polygon,
      active,
      priority
    ) VALUES (
      v_area_code,
      'منطقة مكررة',
      '[[44.10,15.30],[44.20,15.30],[44.20,15.40]]'::jsonb,
      true,
      50
    );
  EXCEPTION WHEN unique_violation THEN
    v_duplicate := true;
  END;
  IF NOT v_duplicate THEN
    RAISE EXCEPTION 'service-area code uniqueness was not enforced';
  END IF;

  BEGIN
    INSERT INTO dsh_service_area_geofences (
      service_area_code,
      display_name,
      polygon
    ) VALUES (
      'invalid_' || v_suffix,
      'مضلع غير صالح',
      '{}'::jsonb
    );
  EXCEPTION WHEN check_violation THEN
    v_invalid_polygon := true;
  END;
  IF NOT v_invalid_polygon THEN
    RAISE EXCEPTION 'service-area polygon JSON type was not enforced';
  END IF;

  INSERT INTO dsh_platform_zones (
    id,
    name,
    city_code,
    description
  ) VALUES (
    v_zone_id,
    'منطقة تشغيل اختبار',
    v_area_code,
    'اختبار قيود سياسات المنصة'
  );

  INSERT INTO dsh_platform_sla_rules (
    zone_id,
    category,
    max_prep_mins,
    max_delivery_mins,
    updated_by
  ) VALUES (
    v_zone_id,
    'default',
    20,
    45,
    'test-operator'
  );

  INSERT INTO dsh_platform_capacity_configs (
    zone_id,
    max_concurrent_orders,
    max_captains_online,
    throttle_threshold,
    updated_by
  ) VALUES (
    v_zone_id,
    100,
    30,
    0.8,
    'test-operator'
  );

  INSERT INTO dsh_platform_policy_events (
    aggregate_type,
    aggregate_id,
    action,
    actor_id,
    actor_surface,
    correlation_id,
    reason,
    to_version,
    payload
  ) VALUES (
    'zone',
    v_zone_id,
    'created',
    'test-operator',
    'control-panel',
    'test-correlation',
    'اختبار سجل التدقيق',
    1,
    jsonb_build_object('zoneId', v_zone_id)
  );

  INSERT INTO dsh_platform_policy_mutation_results (
    actor_id,
    operation,
    idempotency_key,
    request_hash,
    response_body
  ) VALUES (
    'test-operator',
    'update-zone:' || v_zone_id,
    'test-idempotency-key',
    'hash-a',
    jsonb_build_object('zoneId', v_zone_id)
  );

  v_duplicate := false;
  BEGIN
    INSERT INTO dsh_platform_policy_mutation_results (
      actor_id,
      operation,
      idempotency_key,
      request_hash,
      response_body
    ) VALUES (
      'test-operator',
      'update-zone:' || v_zone_id,
      'test-idempotency-key',
      'hash-b',
      '{}'::jsonb
    );
  EXCEPTION WHEN unique_violation THEN
    v_duplicate := true;
  END;
  IF NOT v_duplicate THEN
    RAISE EXCEPTION 'platform policy idempotency uniqueness was not enforced';
  END IF;

  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name IN (
      'dsh_platform_zones',
      'dsh_platform_sla_rules',
      'dsh_platform_capacity_configs',
      'dsh_platform_store_onboarding_fee_policy'
    )
    AND column_name = 'version';
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'version column is missing from one or more governed policies: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM dsh_platform_policy_events
  WHERE aggregate_type = 'zone'
    AND aggregate_id = v_zone_id
    AND actor_id = 'test-operator';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'platform policy audit event was not persisted';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_constraint
  WHERE conrelid = 'dsh_platform_sla_rules'::regclass
    AND contype = 'f';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'SLA zone foreign key is missing';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_constraint
  WHERE conrelid = 'dsh_platform_capacity_configs'::regclass
    AND contype = 'f';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'capacity zone foreign key is missing';
  END IF;
END $$;

ROLLBACK;
