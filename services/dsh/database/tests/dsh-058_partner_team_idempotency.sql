\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  test_store_id text := 'test-team-idem-' || replace(gen_random_uuid()::text, '-', '');
  actor_id text := 'test-actor-' || replace(gen_random_uuid()::text, '-', '');
  member_id text;
  count_before integer;
  count_after integer;
  version_before integer;
  version_after integer;
  audit_before integer;
  audit_after integer;
BEGIN
  INSERT INTO dsh_stores (
    id, name_ar, name_en, vertical, city_code, city_name_ar, zone_code,
    logo_url, cover_url, rating, minimum_order_amount, eta_min_minutes,
    eta_max_minutes, is_open, is_accepting_orders, delivery_modes, categories,
    status, publication_status, client_visibility_status
  ) VALUES (
    test_store_id, 'متجر اختبار', 'Idempotency Test Store', 'restaurant',
    'sanaa', 'صنعاء', 'test-zone', '', '', 0, 0, 10, 20,
    false, false, ARRAY['pickup']::text[], ARRAY[]::text[],
    'active', 'draft', 'hidden'
  );

  INSERT INTO dsh_store_team_members (
    store_id, invited_identity, display_name, role, status, invited_by_actor_id
  ) VALUES (
    test_store_id, '+967700000001', 'عضو اختبار', 'staff', 'invited', actor_id
  ) RETURNING id INTO member_id;

  SELECT count(*) INTO count_before
  FROM dsh_store_team_members
  WHERE store_id = test_store_id AND invited_identity = '+967700000001' AND status = 'invited';

  INSERT INTO dsh_store_team_members (
    store_id, invited_identity, display_name, role, status, invited_by_actor_id
  ) VALUES (
    test_store_id, '+967700000001', 'عضو اختبار', 'staff', 'invited', actor_id
  );

  SELECT count(*) INTO count_after
  FROM dsh_store_team_members
  WHERE store_id = test_store_id AND invited_identity = '+967700000001' AND status = 'invited';

  IF count_before <> 1 OR count_after <> 1 THEN
    RAISE EXCEPTION 'duplicate pending invite was not suppressed: before %, after %', count_before, count_after;
  END IF;

  SELECT version INTO version_before FROM dsh_store_team_members WHERE id = member_id;
  UPDATE dsh_store_team_members SET status = status WHERE id = member_id;
  SELECT version INTO version_after FROM dsh_store_team_members WHERE id = member_id;
  IF version_after <> version_before THEN
    RAISE EXCEPTION 'no-op status update changed version: before %, after %', version_before, version_after;
  END IF;

  SELECT count(*) INTO audit_before FROM dsh_store_team_member_actions WHERE member_id = member_id;
  INSERT INTO dsh_store_team_member_actions (
    member_id, store_id, action_label, from_status, to_status, actor_id, reason
  ) VALUES (
    member_id, test_store_id, 'activate', 'active', 'active', actor_id, 'retry'
  );
  SELECT count(*) INTO audit_after FROM dsh_store_team_member_actions WHERE member_id = member_id;
  IF audit_after <> audit_before THEN
    RAISE EXCEPTION 'no-op team action created duplicate audit row';
  END IF;
END $$;

ROLLBACK;
