\set ON_ERROR_STOP on

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wlt_payout_destinations' AND column_name = 'owner_actor_id' AND is_nullable = 'NO'
  ) THEN missing := array_append(missing, 'wlt_payout_destinations.owner_actor_id NOT NULL'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wlt_payout_destinations' AND column_name = 'owner_actor_type' AND is_nullable = 'NO'
  ) THEN missing := array_append(missing, 'wlt_payout_destinations.owner_actor_type NOT NULL'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'wlt_payout_destinations_one_active_owner_uidx'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%owner_actor_type%owner_actor_id%'
      AND indexdef ILIKE '%WHERE (active = true)%'
  ) THEN missing := array_append(missing, 'one active destination per typed owner index'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wlt_payout_requests' AND column_name = 'payout_destination_id'
  ) THEN missing := array_append(missing, 'wlt_payout_requests.payout_destination_id'); END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'wlt_payout_requests'
      AND constraint_name = 'wlt_payout_requests_destination_fk'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN missing := array_append(missing, 'wlt_payout_requests_destination_fk'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wlt_payout_requests' AND column_name = 'reconciliation_status' AND column_default ILIKE '%not_required%'
  ) THEN missing := array_append(missing, 'wlt_payout_requests.reconciliation_status'); END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wlt_jrn037_payout_audit_events') THEN
    missing := array_append(missing, 'wlt_jrn037_payout_audit_events');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wlt_jrn037_payout_outbox') THEN
    missing := array_append(missing, 'wlt_jrn037_payout_outbox');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wlt_jrn037_payout_reconciliations') THEN
    missing := array_append(missing, 'wlt_jrn037_payout_reconciliations');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'wlt_jrn037_payout_transition_trigger' AND NOT tgisinternal
  ) THEN missing := array_append(missing, 'wlt_jrn037_payout_transition_trigger'); END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'wlt_payout_requests_request_hash_uidx'
  ) THEN missing := array_append(missing, 'request hash must not permanently block a later identical payout intent'); END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'JRN-037 invariant failure: %', array_to_string(missing, ', ');
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO wlt_payout_destinations
      (partner_id, owner_actor_id, owner_actor_type, beneficiary_name, settlement_preference, active)
    VALUES
      ('actor-jrn037', 'actor-jrn037', 'client', 'invalid owner', 'manual', false);
    RAISE EXCEPTION 'JRN-037 invariant failure: unsupported owner actor type was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$$;

SELECT 'JRN-037 payout destination invariants passed' AS result;
