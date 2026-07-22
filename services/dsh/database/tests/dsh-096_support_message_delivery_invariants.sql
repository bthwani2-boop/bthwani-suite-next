-- JRN-021: support attachments and read receipts must remain durable and scoped.
DO $$
BEGIN
  IF to_regclass('public.dsh_support_message_attachments') IS NULL THEN
    RAISE EXCEPTION 'dsh_support_message_attachments is missing';
  END IF;
  IF to_regclass('public.dsh_support_message_read_receipts') IS NULL THEN
    RAISE EXCEPTION 'dsh_support_message_read_receipts is missing';
  END IF;
  IF to_regclass('public.idx_dsh_support_message_attachments_ticket') IS NULL THEN
    RAISE EXCEPTION 'support attachment ticket index is missing';
  END IF;
  IF to_regclass('public.idx_dsh_support_read_receipts_actor') IS NULL THEN
    RAISE EXCEPTION 'support receipt actor index is missing';
  END IF;
END $$;

DO $$
DECLARE
  attachment_unique_count integer;
  receipt_primary_key_count integer;
BEGIN
  SELECT COUNT(*) INTO attachment_unique_count
  FROM pg_constraint
  WHERE conrelid = 'dsh_support_message_attachments'::regclass
    AND contype = 'u';
  IF attachment_unique_count < 1 THEN
    RAISE EXCEPTION 'support attachments require message/media uniqueness';
  END IF;

  SELECT COUNT(*) INTO receipt_primary_key_count
  FROM pg_constraint
  WHERE conrelid = 'dsh_support_message_read_receipts'::regclass
    AND contype = 'p';
  IF receipt_primary_key_count <> 1 THEN
    RAISE EXCEPTION 'support read receipts require one composite primary key';
  END IF;
END $$;
