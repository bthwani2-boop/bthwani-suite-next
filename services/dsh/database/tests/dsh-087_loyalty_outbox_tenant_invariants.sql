\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  tenant_nullable text;
  earn_source text;
  reversal_source text;
BEGIN
  SELECT is_nullable
  INTO tenant_nullable
  FROM information_schema.columns
  WHERE table_name = 'dsh_wlt_outbox_events'
    AND column_name = 'tenant_id';

  IF tenant_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'WLT outbox tenant context must remain mandatory';
  END IF;

  SELECT prosrc INTO earn_source
  FROM pg_proc
  WHERE oid = 'dsh_enqueue_loyalty_earned_on_delivery()'::regprocedure;

  IF earn_source NOT LIKE '%event_tenant_id%'
     OR earn_source NOT LIKE '%event_type,tenant_id,order_id%' THEN
    RAISE EXCEPTION 'loyalty earn trigger is not tenant scoped';
  END IF;

  SELECT prosrc INTO reversal_source
  FROM pg_proc
  WHERE oid = 'dsh_enqueue_loyalty_reversal(uuid,text)'::regprocedure;

  IF reversal_source NOT LIKE '%original_event.tenant_id%'
     OR reversal_source NOT LIKE '%event_type,tenant_id,order_id%' THEN
    RAISE EXCEPTION 'loyalty reversal is not tenant scoped';
  END IF;
END $$;

ROLLBACK;
