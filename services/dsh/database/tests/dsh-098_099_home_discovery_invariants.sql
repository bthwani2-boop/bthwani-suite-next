BEGIN;

INSERT INTO dsh_home_banners (
  id, title, subtitle, image_url, action_type, action_target,
  sort_order, is_active, publication_status, created_by_actor_id
) VALUES (
  'jrn-007-target-test', 'اختبار الاستهداف', NULL,
  'https://cdn.example.test/jrn-007.jpg', 'none', '',
  999, FALSE, 'draft', 'jrn-007-test'
);

INSERT INTO dsh_home_content_targets (
  content_kind, content_id, target_type, target_value,
  created_by_actor_id, correlation_id
) VALUES
  ('banners', 'jrn-007-target-test', 'city', 'SANA-A', 'jrn-007-test', 'corr-jrn-007-city'),
  ('banners', 'jrn-007-target-test', 'service_area', 'SANA-A-01', 'jrn-007-test', 'corr-jrn-007-area'),
  ('banners', 'jrn-007-target-test', 'audience', 'guest', 'jrn-007-test', 'corr-jrn-007-audience');

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM dsh_home_content_targets
      WHERE content_kind='banners' AND content_id='jrn-007-target-test') <> 3 THEN
    RAISE EXCEPTION 'JRN-007 targeting rows were not persisted';
  END IF;

  BEGIN
    INSERT INTO dsh_home_content_targets (
      content_kind, content_id, target_type, target_value,
      created_by_actor_id, correlation_id
    ) VALUES (
      'banners', 'jrn-007-target-test', 'audience', 'fabricated',
      'jrn-007-test', 'corr-jrn-007-invalid'
    );
    RAISE EXCEPTION 'invalid audience target was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

INSERT INTO dsh_marketing_impressions (
  id, entity_type, entity_id, surface, viewer_ref
) VALUES (
  'jrn-007-impression-1', 'banner', 'jrn-007-target-test',
  'app-client', 'home.session-jrn-007'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO dsh_marketing_impressions (
      id, entity_type, entity_id, surface, viewer_ref
    ) VALUES (
      'jrn-007-impression-2', 'banner', 'jrn-007-target-test',
      'app-client', 'home.session-jrn-007'
    );
    RAISE EXCEPTION 'duplicate home impression was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END;
$$;

DELETE FROM dsh_home_banners WHERE id='jrn-007-target-test';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM dsh_home_content_targets
    WHERE content_kind='banners' AND content_id='jrn-007-target-test'
  ) THEN
    RAISE EXCEPTION 'home targeting rows were not removed after content deletion';
  END IF;
END;
$$;

ROLLBACK;
