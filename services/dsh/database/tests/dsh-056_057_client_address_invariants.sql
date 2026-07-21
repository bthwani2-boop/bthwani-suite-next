\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_client_id text := 'test-client-' || replace(gen_random_uuid()::text, '-', '');
  v_address_id text;
  v_reused_address_id text;
  v_constraint_count integer;
  v_default_violation boolean := false;
  v_duplicate_violation boolean := false;
BEGIN
  INSERT INTO dsh_client_addresses (
    client_id, label, recipient_name, phone_e164, address_line,
    service_area_code, is_default, create_idempotency_key
  ) VALUES (
    v_client_id, 'المنزل', 'مستلم اختبار', '+967700000002',
    'عنوان اختبار أول', 'test-area', true, 'address-create:test-retry'
  ) RETURNING id INTO v_address_id;

  BEGIN
    INSERT INTO dsh_client_addresses (
      client_id, label, recipient_name, phone_e164, address_line,
      service_area_code, is_default, create_idempotency_key
    ) VALUES (
      v_client_id, 'العمل', 'مستلم اختبار', '+967700000003',
      'عنوان اختبار ثان', 'test-area', true, 'address-create:second'
    );
  EXCEPTION WHEN unique_violation THEN
    v_default_violation := true;
  END;
  IF NOT v_default_violation THEN
    RAISE EXCEPTION 'single-default invariant did not reject a second active default';
  END IF;

  BEGIN
    INSERT INTO dsh_client_addresses (
      client_id, label, recipient_name, phone_e164, address_line,
      service_area_code, is_default, create_idempotency_key
    ) VALUES (
      v_client_id, 'نسخة مكررة', 'مستلم اختبار', '+967700000004',
      'عنوان اختبار مكرر', 'test-area', false, 'address-create:test-retry'
    );
  EXCEPTION WHEN unique_violation THEN
    v_duplicate_violation := true;
  END;
  IF NOT v_duplicate_violation THEN
    RAISE EXCEPTION 'active create-idempotency index did not reject duplicate key';
  END IF;

  UPDATE dsh_client_addresses
  SET deleted_at = NOW(), is_default = false, version = version + 1
  WHERE id = v_address_id;

  INSERT INTO dsh_client_addresses (
    client_id, label, recipient_name, phone_e164, address_line,
    service_area_code, is_default, create_idempotency_key
  ) VALUES (
    v_client_id, 'عنوان معاد', 'مستلم اختبار', '+967700000005',
    'عنوان اختبار بعد الحذف', 'test-area', true, 'address-create:test-retry'
  ) RETURNING id INTO v_reused_address_id;

  IF v_reused_address_id = v_address_id THEN
    RAISE EXCEPTION 'soft-deleted address id was unexpectedly reused';
  END IF;

  SELECT count(*) INTO v_constraint_count
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'dsh_checkout_intents'
    AND column_name = 'delivery_address_id';
  IF v_constraint_count <> 1 THEN
    RAISE EXCEPTION 'checkout delivery_address_id column is missing';
  END IF;

  SELECT count(*) INTO v_constraint_count
  FROM pg_constraint
  WHERE conname = 'fk_dsh_checkout_intents_delivery_address';
  IF v_constraint_count <> 1 THEN
    RAISE EXCEPTION 'checkout address foreign key is missing';
  END IF;
END $$;

ROLLBACK;
