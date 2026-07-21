\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  reporter text := 'partner-support-test-' || replace(gen_random_uuid()::text, '-', '');
  ticket_id_value dsh_support_tickets.id%TYPE;
  duplicate_ticket_blocked boolean := false;
  message_id_value dsh_support_messages.id%TYPE;
  duplicate_message_blocked boolean := false;
  event_count integer;
BEGIN
  INSERT INTO dsh_support_tickets (
    reporter_id, reporter_role, subject, description, category, priority,
    create_idempotency_key, correlation_id
  ) VALUES (
    reporter, 'partner', 'اختبار دعم', 'تفاصيل تذكرة دعم اختبارية', 'other', 'normal',
    'ticket-idem-1', 'ticket-corr-1'
  ) RETURNING id INTO ticket_id_value;

  BEGIN
    INSERT INTO dsh_support_tickets (
      reporter_id, reporter_role, subject, description, category, priority,
      create_idempotency_key, correlation_id
    ) VALUES (
      reporter, 'partner', 'تكرار', 'يجب أن يمنع هذا الصف', 'other', 'normal',
      'ticket-idem-1', 'ticket-corr-2'
    );
  EXCEPTION WHEN unique_violation THEN
    duplicate_ticket_blocked := true;
  END;

  IF NOT duplicate_ticket_blocked THEN
    RAISE EXCEPTION 'duplicate partner ticket idempotency key was accepted';
  END IF;

  INSERT INTO dsh_support_messages (
    ticket_id, sender_id, sender_role, body, is_internal,
    create_idempotency_key, correlation_id
  ) VALUES (
    ticket_id_value, reporter, 'partner', 'رسالة اختبار', FALSE,
    'message-idem-1', 'message-corr-1'
  ) RETURNING id INTO message_id_value;

  BEGIN
    INSERT INTO dsh_support_messages (
      ticket_id, sender_id, sender_role, body, is_internal,
      create_idempotency_key, correlation_id
    ) VALUES (
      ticket_id_value, reporter, 'partner', 'رسالة مكررة', FALSE,
      'message-idem-1', 'message-corr-2'
    );
  EXCEPTION WHEN unique_violation THEN
    duplicate_message_blocked := true;
  END;

  IF NOT duplicate_message_blocked THEN
    RAISE EXCEPTION 'duplicate partner support message idempotency key was accepted';
  END IF;

  INSERT INTO dsh_support_ticket_events (
    ticket_id, reporter_id, actor_id, actor_role, event_type, correlation_id
  ) VALUES (
    ticket_id_value, reporter, reporter, 'partner', 'created', 'ticket-corr-1'
  );

  SELECT count(*) INTO event_count
  FROM dsh_support_ticket_events
  WHERE ticket_id = ticket_id_value AND reporter_id = reporter;

  IF event_count <> 1 THEN
    RAISE EXCEPTION 'partner support audit event was not persisted';
  END IF;
END $$;

ROLLBACK;
