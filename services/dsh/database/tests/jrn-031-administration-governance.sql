\set ON_ERROR_STOP on

DO $$
DECLARE
  role_id_value UUID;
  source_approval_id_value UUID;
  audit_id_value UUID;
  rollback_id_value UUID;
BEGIN
  INSERT INTO dsh_admin_roles (name, description, permissions, surfaces)
  VALUES (
    'jrn031-runtime-auditor',
    'JRN-031 database verification role',
    '["administration.audit.read","administration.rollback.approve"]'::jsonb,
    '["control-panel","app-field"]'::jsonb
  )
  RETURNING id INTO role_id_value;

  IF NOT EXISTS (
    SELECT 1
    FROM dsh_admin_roles
    WHERE id = role_id_value
      AND active = TRUE
      AND version = 1
      AND surfaces ? 'control-panel'
  ) THEN
    RAISE EXCEPTION 'role scope or lifecycle defaults are invalid';
  END IF;

  BEGIN
    INSERT INTO dsh_admin_roles (name, permissions, surfaces)
    VALUES ('jrn031-invalid-surface', '["administration.read"]'::jsonb, '["app-field"]'::jsonb);
    RAISE EXCEPTION 'role without control-panel was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  INSERT INTO dsh_admin_approval_requests (
    action_type, target_actor_id, role_id, requested_by, reason,
    status, reviewed_by, review_note, reviewed_at
  ) VALUES (
    'staff_role_assignment', 'actor-beneficiary', role_id_value,
    'actor-maker', 'governed assignment request',
    'approved', 'actor-original-checker', 'approved for verification', NOW()
  ) RETURNING id INTO source_approval_id_value;

  INSERT INTO dsh_admin_staff_assignments (actor_id, role_id, assigned_by)
  VALUES ('actor-beneficiary', role_id_value, 'actor-original-checker');

  INSERT INTO dsh_admin_rollback_requests (
    source_approval_id, inverse_action_type, target_actor_id,
    role_id, requested_by, reason
  ) VALUES (
    source_approval_id_value, 'staff_role_revocation', 'actor-beneficiary',
    role_id_value, 'actor-rollback-maker', 'permission should be reversed'
  ) RETURNING id INTO rollback_id_value;

  BEGIN
    UPDATE dsh_admin_rollback_requests
    SET status = 'approved'
    WHERE id = rollback_id_value;
    RAISE EXCEPTION 'approved rollback without reviewer was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  UPDATE dsh_admin_rollback_requests
  SET status = 'approved',
      reviewed_by = 'actor-rollback-checker',
      review_note = 'independent rollback approval',
      reviewed_at = NOW(),
      version = version + 1,
      updated_at = NOW()
  WHERE id = rollback_id_value;

  IF NOT EXISTS (
    SELECT 1
    FROM dsh_admin_rollback_requests
    WHERE id = rollback_id_value
      AND status = 'approved'
      AND reviewed_by <> requested_by
      AND reviewed_by <> target_actor_id
      AND version = 2
  ) THEN
    RAISE EXCEPTION 'rollback independent review state is invalid';
  END IF;

  INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity)
  VALUES (
    'actor-rollback-checker',
    'administration_rollback_approved',
    'actor-beneficiary',
    '{"request_id":"runtime-verification","decision":"approved"}',
    'restricted'
  ) RETURNING id INTO audit_id_value;

  BEGIN
    UPDATE dsh_admin_audit SET detail = 'tampered' WHERE id = audit_id_value;
    RAISE EXCEPTION 'append-only audit update was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM NOT LIKE '%append-only%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    DELETE FROM dsh_admin_audit WHERE id = audit_id_value;
    RAISE EXCEPTION 'append-only audit delete was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM NOT LIKE '%append-only%' THEN
        RAISE;
      END IF;
  END;
END;
$$;
