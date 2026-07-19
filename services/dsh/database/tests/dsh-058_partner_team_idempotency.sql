\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_test_store_id text := 'test-team-idem-' || replace(gen_random_uuid()::text, '-', '');
  v_actor_id text := 'test-actor-' || replace(gen_random_uuid()::text, '-', '');
  v_member_id text;
  v_count_before integer;
  v_count_after integer;
  v_version_before integer;
  v_version_after integer;
  v_audit_before integer;
  v_audit_after integer;
BEGIN
  INSERT INTO dsh_stores (
    id,
    slug,
    display_name,
    status,
    city_code,
    service_area_code,
    serviceability_status,
    is_visible
  ) VALUES (
    v_test_store_id,
    v_test_store_id,
    'Idempotency Test Store',
    'active',
    'sanaa',
    'sanaa',
    'serviceable',
    false
  );

  INSERT INTO dsh_store_team_members (
    store_id, invited_identity, display_name, role, status, invited_by_actor_id
  ) VALUES (
    v_test_store_id, '+967700000001', 'عضو اختبار', 'staff', 'invited', v_actor_id
  ) RETURNING id INTO v_member_id;

  SELECT count(*) INTO v_count_before
  FROM dsh_store_team_members AS team_member
  WHERE team_member.store_id = v_test_store_id
    AND team_member.invited_identity = '+967700000001'
    AND team_member.status = 'invited';

  INSERT INTO dsh_store_team_members (
    store_id, invited_identity, display_name, role, status, invited_by_actor_id
  ) VALUES (
    v_test_store_id, '+967700000001', 'عضو اختبار', 'staff', 'invited', v_actor_id
  );

  SELECT count(*) INTO v_count_after
  FROM dsh_store_team_members AS team_member
  WHERE team_member.store_id = v_test_store_id
    AND team_member.invited_identity = '+967700000001'
    AND team_member.status = 'invited';

  IF v_count_before <> 1 OR v_count_after <> 1 THEN
    RAISE EXCEPTION 'duplicate pending invite was not suppressed: before %, after %', v_count_before, v_count_after;
  END IF;

  SELECT team_member.version INTO v_version_before
  FROM dsh_store_team_members AS team_member
  WHERE team_member.id = v_member_id;

  UPDATE dsh_store_team_members AS team_member
  SET status = team_member.status
  WHERE team_member.id = v_member_id;

  SELECT team_member.version INTO v_version_after
  FROM dsh_store_team_members AS team_member
  WHERE team_member.id = v_member_id;

  IF v_version_after <> v_version_before THEN
    RAISE EXCEPTION 'no-op status update changed version: before %, after %', v_version_before, v_version_after;
  END IF;

  SELECT count(*) INTO v_audit_before
  FROM dsh_store_team_member_actions AS action
  WHERE action.member_id = v_member_id;

  INSERT INTO dsh_store_team_member_actions (
    member_id, store_id, action_label, from_status, to_status, actor_id, reason
  ) VALUES (
    v_member_id, v_test_store_id, 'activate', 'active', 'active', v_actor_id, 'retry'
  );

  SELECT count(*) INTO v_audit_after
  FROM dsh_store_team_member_actions AS action
  WHERE action.member_id = v_member_id;

  IF v_audit_after <> v_audit_before THEN
    RAISE EXCEPTION 'no-op team action created duplicate audit row';
  END IF;
END $$;

ROLLBACK;
