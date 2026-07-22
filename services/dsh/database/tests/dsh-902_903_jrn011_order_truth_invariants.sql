-- JRN-011 database security and isolation invariants.
-- Run after dsh-902 and dsh-903 in an isolated verification database.
BEGIN;

DO $$
DECLARE
  missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='dsh_orders' AND column_name='order_number' AND is_nullable='NO'
  ) THEN missing := array_append(missing, 'dsh_orders.order_number NOT NULL'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='dsh_orders' AND column_name='correlation_id' AND is_nullable='NO'
  ) THEN missing := array_append(missing, 'dsh_orders.correlation_id NOT NULL'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname='uq_dsh_orders_tenant_order_number'
      AND indexdef ILIKE '%UNIQUE%tenant_id%order_number%'
  ) THEN missing := array_append(missing, 'tenant order-number uniqueness'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname='uq_dsh_orders_tenant_correlation'
      AND indexdef ILIKE '%UNIQUE%tenant_id%correlation_id%'
  ) THEN missing := array_append(missing, 'tenant correlation uniqueness'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname='dsh_order_create_idempotency_pkey'
      AND indexdef ILIKE '%tenant_id%client_id%idempotency_key%'
  ) THEN missing := array_append(missing, 'tenant/client idempotency key'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname='dsh_order_create_idempotency_tenant_id_checkout_intent_id_key'
      AND indexdef ILIKE '%tenant_id%checkout_intent_id%'
  ) THEN missing := array_append(missing, 'one order attempt per tenant checkout'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_dsh_jrn011_protect_order_snapshot' AND NOT tgisinternal
  ) THEN missing := array_append(missing, 'immutable order snapshot trigger'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_dsh_jrn011_order_event_outbox' AND NOT tgisinternal
  ) THEN missing := array_append(missing, 'transactional order event outbox trigger'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='dsh_order_status_events' AND column_name='tenant_id' AND is_nullable='NO'
  ) THEN missing := array_append(missing, 'tenant-scoped events'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname='uq_dsh_order_events_order_version_type'
      AND indexdef ILIKE '%order_id%order_version%event_type%'
  ) THEN missing := array_append(missing, 'event replay uniqueness'); END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'JRN-011 invariant failure: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- No test data is committed.
ROLLBACK;
