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

  -- wlt-113 replaced wlt_payout_destinations_one_active_owner_uidx with an
  -- operator-context-scoped index: uniqueness of the single active destination is
  -- per (operator_context_id, owner_actor_type, owner_actor_id), not per owner
  -- alone. Asserting the retired name made this test fail on every current schema.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'wlt_payout_destinations_one_active_operatorcontext_owner_idx'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%operator_context_id%owner_actor_type%owner_actor_id%'
      AND indexdef ILIKE '%WHERE (active = true)%'
  ) THEN missing := array_append(missing, 'one active destination per operator-context typed owner index'); END IF;

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

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wlt_payout_audit_events') THEN
    missing := array_append(missing, 'wlt_payout_audit_events');
  END IF;
  -- wlt_payout_outbox is intentionally absent after wlt-903: it was a write-only
  -- table with no consumer, and every transition it would have carried is already
  -- captured in wlt_payout_audit_events. Asserted gone, not present, so the dead
  -- producer cannot silently return.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wlt_payout_outbox') THEN
    missing := array_append(missing, 'wlt_payout_outbox_must_stay_dropped');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wlt_payout_reconciliations') THEN
    missing := array_append(missing, 'wlt_payout_reconciliations');
  END IF;

  -- wlt-902 renamed this trigger to wlt_payout_transition_audit_trigger when the
  -- payout transition capture became audit-only. The old name no longer exists.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'wlt_payout_transition_audit_trigger' AND NOT tgisinternal
  ) THEN missing := array_append(missing, 'wlt_payout_transition_audit_trigger'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'wlt_single_reconciliation_claim_trigger' AND NOT tgisinternal
  ) THEN missing := array_append(missing, 'wlt_single_reconciliation_claim_trigger'); END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'wlt_payout_requests_request_hash_uidx'
  ) THEN missing := array_append(missing, 'request hash must not permanently block a later identical payout intent'); END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION ' invariant failure: %', array_to_string(missing, ', ');
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    -- operator_context_id became NOT NULL in wlt-112. Without it this insert failed
    -- with not_null_violation before ever reaching the owner_actor_type check, so
    -- the test passed while proving nothing about the constraint it names.
    INSERT INTO wlt_payout_destinations
      (operator_context_id, partner_id, owner_actor_id, owner_actor_type, beneficiary_name, settlement_preference, active)
    VALUES
      ('ctx-invariant-probe', 'actor-', 'actor-', 'client', 'invalid owner', 'manual', false);
    RAISE EXCEPTION ' invariant failure: unsupported owner actor type was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$$;

SELECT ' payout destination invariants passed' AS result;
