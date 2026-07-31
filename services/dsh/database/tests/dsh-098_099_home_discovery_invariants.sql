BEGIN;

INSERT INTO dsh_home_banners (
  id, title, subtitle, image_url, action_type, action_target,
  sort_order, is_active, publication_status, created_by_actor_id
) VALUES (
  'target-test', 'اختبار الاستهداف', NULL,
  'https://cdn.example.test/.jpg', 'none', '',
  999, FALSE, 'draft', 'test'
);

INSERT INTO dsh_home_content_targets (
  content_kind, content_id, target_type, target_value,
  created_by_actor_id, correlation_id
) VALUES
  ('banners', 'target-test', 'city', 'SANA-A', 'test', 'corr-city'),
  ('banners', 'target-test', 'service_area', 'SANA-A-01', 'test', 'corr-area'),
  ('banners', 'target-test', 'audience', 'guest', 'test', 'corr-audience');

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM dsh_home_content_targets
      WHERE content_kind='banners' AND content_id='target-test') <> 3 THEN
    RAISE EXCEPTION ' targeting rows were not persisted';
  END IF;

  BEGIN
    INSERT INTO dsh_home_content_targets (
      content_kind, content_id, target_type, target_value,
      created_by_actor_id, correlation_id
    ) VALUES (
      'banners', 'target-test', 'audience', 'fabricated',
      'test', 'corr-invalid'
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
  'impression-1', 'banner', 'target-test',
  'app-client', 'home.session-'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO dsh_marketing_impressions (
      id, entity_type, entity_id, surface, viewer_ref
    ) VALUES (
      'impression-2', 'banner', 'target-test',
      'app-client', 'home.session-'
    );
    RAISE EXCEPTION 'duplicate home impression was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END;
$$;

DELETE FROM dsh_home_banners WHERE id='target-test';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM dsh_home_content_targets
    WHERE content_kind='banners' AND content_id='target-test'
  ) THEN
    RAISE EXCEPTION 'home targeting rows were not removed after content deletion';
  END IF;
END;
$$;

ROLLBACK;
