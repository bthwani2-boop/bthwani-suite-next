\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  constraint_count integer;
  index_count integer;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conname IN (
    'dsh_stores_version_positive_chk',
    'dsh_store_action_audit_actor_role_chk'
  );
  IF constraint_count <> 2 THEN
    RAISE EXCEPTION 'JRN-004 expected two governance constraints, found %', constraint_count;
  END IF;

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE indexname IN (
    'idx_dsh_stores_operator_page',
    'idx_dsh_stores_public_discovery_gate',
    'idx_dsh_store_action_audit_correlation',
    'idx_dsh_store_idempotency_expiry'
  );
  IF index_count <> 4 THEN
    RAISE EXCEPTION 'JRN-004 expected four governance indexes, found %', index_count;
  END IF;
END $$;

INSERT INTO dsh_stores (
  id, slug, display_name, status, city_code, service_area_code,
  serviceability_status, is_visible, category, delivery_modes,
  partner_readiness, catalog_approval_status, marketing_visibility,
  address_line, coverage_summary, operating_hours, delivery_readiness,
  hero_image_url, logo_url, version
) VALUES (
  'store-jrn-004-db-proof', 'store-jrn-004-db-proof', 'متجر إثبات الرحلة الرابعة',
  'active', 'sana', 'haddah', 'serviceable', true, 'default',
  ARRAY['delivery']::text[], 'ready', 'approved', 'visible',
  'شارع حدة', 'حدة والمناطق المجاورة', '08:00-23:00', 'ready',
  'https://cdn.example.test/store-cover.jpg', 'https://cdn.example.test/store-logo.jpg', 1
);

INSERT INTO dsh_store_action_audit (
  id, actor_id, actor_role, store_id, action, from_state, to_state,
  reason, correlation_id
) VALUES (
  'audit-jrn-004-db-proof', 'operator-jrn-004', 'operator',
  'store-jrn-004-db-proof', 'operator.visibility.update', '{}'::jsonb,
  '{"isVisible":true}'::jsonb, 'database proof', 'corr-jrn-004-db-proof'
);

INSERT INTO dsh_store_idempotency (
  actor_id, operation, idempotency_key, request_hash, response_body
) VALUES (
  'operator-jrn-004', 'operator.visibility.update', 'idem-jrn-004-db-proof',
  'hash-jrn-004-db-proof', '{"replayed":false}'::jsonb
);

DO $$
DECLARE
  created_value timestamptz;
  expires_value timestamptz;
BEGIN
  SELECT created_at, expires_at
  INTO created_value, expires_value
  FROM dsh_store_idempotency
  WHERE actor_id = 'operator-jrn-004'
    AND operation = 'operator.visibility.update'
    AND idempotency_key = 'idem-jrn-004-db-proof';

  IF expires_value IS NULL OR expires_value <= created_value THEN
    RAISE EXCEPTION 'JRN-004 idempotency expiry was not populated';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE dsh_stores SET version = 0 WHERE id = 'store-jrn-004-db-proof';
    RAISE EXCEPTION 'JRN-004 version invariant accepted zero';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO dsh_store_action_audit (
      id, actor_id, actor_role, store_id, action, from_state, to_state,
      reason, correlation_id
    ) VALUES (
      'audit-jrn-004-invalid-role', 'unknown-jrn-004', 'client',
      'store-jrn-004-db-proof', 'invalid', '{}'::jsonb, '{}'::jsonb,
      'must fail', 'corr-jrn-004-invalid-role'
    );
    RAISE EXCEPTION 'JRN-004 audit actor-role invariant accepted client';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END $$;

ROLLBACK;
