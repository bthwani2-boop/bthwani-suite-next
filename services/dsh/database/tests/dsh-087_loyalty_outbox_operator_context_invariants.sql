\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  OperatorContext_nullable text;
  earn_source text;
  reversal_source text;
BEGIN
  SELECT is_nullable
  INTO OperatorContext_nullable
  FROM information_schema.columns
  WHERE table_name = 'dsh_wlt_outbox_events'
    AND column_name = 'operator_context_id';

  IF OperatorContext_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'WLT outbox OperatorContext context must remain mandatory';
  END IF;

  SELECT prosrc INTO earn_source
  FROM pg_proc
  WHERE oid = 'dsh_enqueue_loyalty_earned_on_delivery()'::regprocedure;

  IF earn_source NOT LIKE '%event_operator_context_id%'
     OR earn_source NOT LIKE '%event_type,operator_context_id,order_id%' THEN
    RAISE EXCEPTION 'loyalty earn trigger is not OperatorContext scoped';
  END IF;

  SELECT prosrc INTO reversal_source
  FROM pg_proc
  WHERE oid = 'dsh_enqueue_loyalty_reversal(uuid,text)'::regprocedure;

  IF reversal_source NOT LIKE '%original_event.operator_context_id%'
     OR reversal_source NOT LIKE '%event_type,operator_context_id,order_id%' THEN
    RAISE EXCEPTION 'loyalty reversal is not OperatorContext scoped';
  END IF;
END $$;

ROLLBACK;
