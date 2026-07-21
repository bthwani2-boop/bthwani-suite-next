-- JRN-023 notification delivery audit invariants.
DO $$
BEGIN
  IF to_regclass('public.dsh_notification_delivery_attempts') IS NULL THEN
    RAISE EXCEPTION 'dsh_notification_delivery_attempts is missing';
  END IF;
  IF to_regclass('public.idx_dsh_notification_dead_letters') IS NULL THEN
    RAISE EXCEPTION 'dead-letter index is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dsh_operational_outbox_events'
      AND column_name = 'failed_at'
  ) THEN
    RAISE EXCEPTION 'operational outbox failed_at is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dsh_operational_outbox_events'
      AND column_name = 'sent_at'
  ) THEN
    RAISE EXCEPTION 'operational outbox sent_at is missing';
  END IF;
END $$;

DO $$
DECLARE
  outcome_check_count integer;
BEGIN
  SELECT COUNT(*) INTO outcome_check_count
  FROM pg_constraint
  WHERE conrelid = 'dsh_notification_delivery_attempts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%dead_letter%';
  IF outcome_check_count < 1 THEN
    RAISE EXCEPTION 'delivery attempt outcome must include dead_letter';
  END IF;
END $$;
