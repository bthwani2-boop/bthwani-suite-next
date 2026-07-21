\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_address_id text;
  v_scheduled timestamptz;
BEGIN
  INSERT INTO dsh_client_addresses (
    client_id,
    label,
    recipient_name,
    phone_e164,
    address_line,
    service_area_code,
    create_idempotency_key,
    deleted_at
  ) VALUES (
    'privacy-reschedule-client-' || v_suffix,
    'home',
    'Retention Subject',
    '+967744444444',
    'Retention policy address',
    'sanaa',
    'privacy-reschedule-' || v_suffix,
    NOW() - interval '10 days'
  ) RETURNING id INTO v_address_id;

  UPDATE dsh_client_address_privacy_policy
     SET enabled = FALSE,
         version = version + 1,
         updated_by = 'privacy-reschedule-test',
         updated_at = NOW()
   WHERE id = 1;

  SELECT pii_purge_after
    INTO v_scheduled
    FROM dsh_client_addresses
   WHERE id = v_address_id;
  IF v_scheduled IS NOT NULL THEN
    RAISE EXCEPTION 'disabled privacy policy did not clear purge schedule';
  END IF;

  UPDATE dsh_client_address_privacy_policy
     SET enabled = TRUE,
         retention_days = 5,
         version = version + 1,
         updated_by = 'privacy-reschedule-test',
         updated_at = NOW()
   WHERE id = 1;

  SELECT pii_purge_after
    INTO v_scheduled
    FROM dsh_client_addresses
   WHERE id = v_address_id;
  IF v_scheduled IS NULL OR v_scheduled > NOW() - interval '4 days' THEN
    RAISE EXCEPTION 'enabled privacy policy did not reschedule from deletion time';
  END IF;

  UPDATE dsh_client_address_privacy_policy
     SET retention_days = 30,
         version = version + 1,
         updated_by = 'privacy-reschedule-test',
         updated_at = NOW()
   WHERE id = 1;

  SELECT pii_purge_after
    INTO v_scheduled
    FROM dsh_client_addresses
   WHERE id = v_address_id;
  IF v_scheduled < NOW() + interval '19 days' OR
     v_scheduled > NOW() + interval '21 days' THEN
    RAISE EXCEPTION 'retention change did not recompute purge schedule';
  END IF;
END $$;

ROLLBACK;
