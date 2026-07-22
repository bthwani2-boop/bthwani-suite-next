\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_actor_id text := 'jrn-023-' || replace(gen_random_uuid()::text, '-', '');
  v_topic text := 'jrn-023.policy.' || replace(gen_random_uuid()::text, '-', '');
  v_notification_id uuid := gen_random_uuid();
  v_push_token text := 'ExponentPushToken[' || replace(gen_random_uuid()::text, '-', '') || ']';
  v_invalid boolean := false;
  v_duplicate boolean := false;
  v_count integer;
BEGIN
  INSERT INTO dsh_notification_preferences (
    actor_id,
    actor_type,
    topic,
    enabled,
    channels,
    quiet_hours_start,
    quiet_hours_end,
    locale,
    timezone
  ) VALUES (
    v_actor_id,
    'client',
    v_topic,
    true,
    ARRAY['in_app', 'push']::text[],
    '22:00',
    '07:00',
    'ar',
    'Asia/Aden'
  );

  BEGIN
    INSERT INTO dsh_notification_preferences (
      actor_id, actor_type, topic, enabled, channels, locale, timezone
    ) VALUES (
      v_actor_id || '-invalid-channel',
      'client',
      v_topic,
      true,
      ARRAY['sms']::text[],
      'ar',
      'Asia/Aden'
    );
  EXCEPTION WHEN check_violation THEN
    v_invalid := true;
  END;
  IF NOT v_invalid THEN
    RAISE EXCEPTION 'unsupported notification channel was accepted';
  END IF;

  v_invalid := false;
  BEGIN
    INSERT INTO dsh_notification_preferences (
      actor_id, actor_type, topic, enabled, channels,
      quiet_hours_start, quiet_hours_end, locale, timezone
    ) VALUES (
      v_actor_id || '-partial-quiet',
      'client',
      v_topic,
      true,
      ARRAY['in_app']::text[],
      '22:00',
      NULL,
      'ar',
      'Asia/Aden'
    );
  EXCEPTION WHEN check_violation THEN
    v_invalid := true;
  END;
  IF NOT v_invalid THEN
    RAISE EXCEPTION 'partial quiet-hour pair was accepted';
  END IF;

  v_invalid := false;
  BEGIN
    INSERT INTO dsh_notification_preferences (
      actor_id, actor_type, topic, enabled, channels, locale, timezone
    ) VALUES (
      v_actor_id || '-invalid-locale',
      'client',
      v_topic,
      true,
      ARRAY['in_app']::text[],
      'fr',
      'Asia/Aden'
    );
  EXCEPTION WHEN check_violation THEN
    v_invalid := true;
  END;
  IF NOT v_invalid THEN
    RAISE EXCEPTION 'unsupported notification locale was accepted';
  END IF;

  INSERT INTO dsh_platform_notification_config (
    topic,
    actor_types,
    is_enabled,
    description,
    default_channels,
    title_ar,
    body_ar,
    title_en,
    body_en,
    variables,
    deep_link_pattern,
    updated_by
  ) VALUES (
    v_topic,
    ARRAY['client', 'partner']::text[],
    true,
    'JRN-023 policy invariant',
    ARRAY['in_app', 'push']::text[],
    'تحديث {{entityId}}',
    'تغيرت الحالة إلى {{status}}',
    'Update {{entityId}}',
    'Status changed to {{status}}',
    ARRAY['entityId', 'status']::text[],
    '/orders/{{entityId}}',
    'jrn-023-test'
  );

  v_invalid := false;
  BEGIN
    INSERT INTO dsh_platform_notification_config (
      topic, actor_types, is_enabled, default_channels
    ) VALUES (
      v_topic || '.invalid-actor',
      ARRAY['unknown']::text[],
      true,
      ARRAY['in_app']::text[]
    );
  EXCEPTION WHEN check_violation THEN
    v_invalid := true;
  END;
  IF NOT v_invalid THEN
    RAISE EXCEPTION 'unsupported platform notification actor type was accepted';
  END IF;

  INSERT INTO dsh_notification_push_endpoints (
    actor_id,
    actor_type,
    provider,
    endpoint_token,
    device_id,
    platform
  ) VALUES (
    v_actor_id,
    'client',
    'expo',
    v_push_token,
    'device-primary',
    'android'
  );

  v_duplicate := false;
  BEGIN
    INSERT INTO dsh_notification_push_endpoints (
      actor_id, actor_type, provider, endpoint_token, device_id, platform
    ) VALUES (
      v_actor_id || '-other',
      'client',
      'expo',
      v_push_token,
      'device-other',
      'android'
    );
  EXCEPTION WHEN unique_violation THEN
    v_duplicate := true;
  END;
  IF NOT v_duplicate THEN
    RAISE EXCEPTION 'push provider token was accepted for two actors';
  END IF;

  v_invalid := false;
  BEGIN
    INSERT INTO dsh_notification_push_endpoints (
      actor_id, actor_type, provider, endpoint_token, device_id, platform
    ) VALUES (
      v_actor_id || '-invalid-platform',
      'client',
      'expo',
      v_push_token || '-other',
      'device-invalid',
      'web'
    );
  EXCEPTION WHEN check_violation THEN
    v_invalid := true;
  END;
  IF NOT v_invalid THEN
    RAISE EXCEPTION 'unsupported push endpoint platform was accepted';
  END IF;

  INSERT INTO dsh_notifications (
    id,
    actor_id,
    actor_type,
    topic,
    title,
    body,
    action_url,
    delivery_channels
  ) VALUES (
    v_notification_id,
    v_actor_id,
    'client',
    v_topic,
    'اختبار',
    'اختبار سياسة قنوات الإشعار',
    '/orders/test',
    ARRAY['in_app', 'push']::text[]
  );

  INSERT INTO dsh_notification_channel_deliveries (
    notification_id,
    channel,
    status,
    attempt_count,
    sent_at
  ) VALUES (
    v_notification_id,
    'in_app',
    'sent',
    0,
    NOW()
  );

  BEGIN
    INSERT INTO dsh_notification_channel_deliveries (
      notification_id,
      channel,
      status
    ) VALUES (
      v_notification_id,
      'in_app',
      'pending'
    );
  EXCEPTION WHEN unique_violation THEN
    v_duplicate := true;
  END;
  IF NOT v_duplicate THEN
    RAISE EXCEPTION 'notification/channel idempotency uniqueness was not enforced';
  END IF;

  INSERT INTO dsh_notification_channel_deliveries (
    notification_id,
    channel,
    status,
    attempt_count
  ) VALUES (
    v_notification_id,
    'push',
    'pending',
    0
  );

  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'dsh_notification_preferences'
    AND column_name IN ('channels', 'quiet_hours_start', 'quiet_hours_end', 'locale', 'timezone');
  IF v_count <> 5 THEN
    RAISE EXCEPTION 'notification preference policy columns are incomplete: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'dsh_platform_notification_config'
    AND column_name IN (
      'default_channels', 'title_ar', 'body_ar', 'title_en',
      'body_en', 'variables', 'deep_link_pattern'
    );
  IF v_count <> 7 THEN
    RAISE EXCEPTION 'platform notification template columns are incomplete: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'dsh_notification_push_endpoints'
    AND column_name IN (
      'actor_id', 'actor_type', 'provider', 'endpoint_token',
      'device_id', 'platform', 'active', 'last_seen_at'
    );
  IF v_count <> 8 THEN
    RAISE EXCEPTION 'push endpoint columns are incomplete: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_constraint
  WHERE conrelid = 'dsh_notification_channel_deliveries'::regclass
    AND contype = 'f';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'notification channel delivery foreign key is missing';
  END IF;
END $$;

ROLLBACK;
