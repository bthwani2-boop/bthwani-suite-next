-- Replace phase-numbered database object names with durable financial-domain
-- names. Historical migrations remain immutable; this forward-only cutover is
-- the sole transition from their applied schema. All renames are idempotent:
-- if the source already carries the target name the statement is a safe no-op.

DO $$
BEGIN
  -- settlement
  IF to_regclass('wlt_settlement_requests') IS NULL
     AND to_regclass('wlt_settlement_requests_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_settlement_requests_legacy RENAME TO wlt_settlement_requests;
  END IF;
  IF to_regclass('wlt_settlement_source_evidence') IS NULL
     AND to_regclass('wlt_settlement_source_evidence_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_settlement_source_evidence_legacy RENAME TO wlt_settlement_source_evidence;
  END IF;
  IF to_regclass('wlt_settlement_policy_versions') IS NULL
     AND to_regclass('wlt_settlement_policy_versions_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_settlement_policy_versions_legacy RENAME TO wlt_settlement_policy_versions;
  END IF;
  -- commission
  IF to_regclass('wlt_commission_policy_versions') IS NULL
     AND to_regclass('wlt_commission_policy_versions_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_commission_policy_versions_legacy RENAME TO wlt_commission_policy_versions;
  END IF;
  IF to_regclass('wlt_commission_evidence') IS NULL
     AND to_regclass('wlt_commission_evidence_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_commission_evidence_legacy RENAME TO wlt_commission_evidence;
  END IF;
  IF to_regclass('wlt_commission_adjustments') IS NULL
     AND to_regclass('wlt_commission_adjustments_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_commission_adjustments_legacy RENAME TO wlt_commission_adjustments;
  END IF;
  -- audit / receipts / outbox / reconciliation
  IF to_regclass('wlt_finance_audit_events') IS NULL
     AND to_regclass('wlt_audit_events') IS NOT NULL THEN
    ALTER TABLE wlt_audit_events RENAME TO wlt_finance_audit_events;
  END IF;
  IF to_regclass('wlt_mutation_receipts') IS NULL
     AND to_regclass('wlt_mutation_receipts_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_mutation_receipts_legacy RENAME TO wlt_mutation_receipts;
  END IF;
  IF to_regclass('wlt_payout_audit_events') IS NULL
     AND to_regclass('wlt_payout_audit_events_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_payout_audit_events_legacy RENAME TO wlt_payout_audit_events;
  END IF;
  IF to_regclass('wlt_payout_outbox') IS NULL
     AND to_regclass('wlt_payout_outbox_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_payout_outbox_legacy RENAME TO wlt_payout_outbox;
  END IF;
  IF to_regclass('wlt_payout_reconciliations') IS NULL
     AND to_regclass('wlt_payout_reconciliations_legacy') IS NOT NULL THEN
    ALTER TABLE wlt_payout_reconciliations_legacy RENAME TO wlt_payout_reconciliations;
  END IF;
END $$;

DROP TRIGGER IF EXISTS wlt_payout_transition_trigger
  ON wlt_payout_requests;
DROP TRIGGER IF EXISTS wlt_single_reconciliation_claim_trigger
  ON wlt_payout_requests;
DROP FUNCTION IF EXISTS wlt_capture_payout_transition();
DROP FUNCTION IF EXISTS wlt_reject_duplicate_reconciliation_claim();
DROP FUNCTION IF EXISTS wlt_assert_reconciliation_claim();

CREATE OR REPLACE FUNCTION wlt_capture_payout_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  event_name text;
  transition_actor_id text;
  transition_actor_type text;
  transition_correlation text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  event_name := CASE NEW.status
    WHEN 'approved' THEN 'payout.approved'
    WHEN 'rejected' THEN 'payout.rejected'
    WHEN 'provider_pending' THEN 'payout.provider_pending'
    WHEN 'provider_result_unknown' THEN 'payout.provider_unknown'
    WHEN 'processing' THEN 'payout.processing'
    WHEN 'completed' THEN 'payout.completed'
    WHEN 'failed' THEN 'payout.failed'
    ELSE NULL
  END;
  IF event_name IS NULL THEN
    RETURN NEW;
  END IF;

  transition_actor_id := COALESCE(
    NULLIF(NEW.completed_by_operator_id, ''),
    NULLIF(NEW.failed_by_operator_id, ''),
    NULLIF(NEW.processed_by_operator_id, ''),
    NULLIF(NEW.rejected_by_operator_id, ''),
    NULLIF(NEW.approved_by_operator_id, ''),
    NULLIF(NEW.operator_id, ''),
    NEW.beneficiary_actor_id
  );
  transition_actor_type := CASE
    WHEN transition_actor_id = NEW.beneficiary_actor_id
      THEN NEW.beneficiary_actor_type
    ELSE 'operator'
  END;
  transition_correlation := COALESCE(
    NULLIF(NEW.idempotency_key, ''),
    'payout:' || NEW.id || ':' || NEW.status
  );

  IF NEW.status = 'provider_result_unknown'
     AND NEW.reconciliation_status = 'not_required' THEN
    NEW.reconciliation_status := 'required';
  END IF;

  INSERT INTO wlt_payout_audit_events
    (operator_context_id, aggregate_type, aggregate_id, action, actor_id, actor_type,
     reason, correlation_id, metadata)
  VALUES (
    NEW.operator_context_id, 'payout_request', NEW.id, event_name,
    transition_actor_id, transition_actor_type,
    COALESCE(NEW.failure_reason, ''), transition_correlation,
    jsonb_build_object(
      'previousStatus', OLD.status,
      'status', NEW.status,
      'payoutDestinationId', NEW.payout_destination_id,
      'providerReference', COALESCE(NEW.provider_reference, ''),
      'providerStatus', COALESCE(NEW.provider_status, '')
    )
  );

  INSERT INTO wlt_payout_outbox
    (operator_context_id, payout_request_id, event_type, recipient_actor_id,
     recipient_actor_type, payload, correlation_id)
  VALUES (
    NEW.operator_context_id, NEW.id, event_name, NEW.beneficiary_actor_id,
    NEW.beneficiary_actor_type,
    jsonb_build_object(
      'status', NEW.status,
      'amountMinorUnits', NEW.amount_minor_units,
      'currency', NEW.currency
    ),
    transition_correlation
  )
  ON CONFLICT (operator_context_id, payout_request_id, event_type) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wlt_payout_transition_audit_trigger
BEFORE UPDATE OF status ON wlt_payout_requests
FOR EACH ROW
EXECUTE FUNCTION wlt_capture_payout_transition();

CREATE OR REPLACE FUNCTION wlt_reject_duplicate_reconciliation_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.reconciliation_status = 'inquiry_pending'
     AND NEW.reconciliation_status = 'inquiry_pending' THEN
    RAISE EXCEPTION
      'payout reconciliation is already in progress for %', NEW.id
      USING ERRCODE = '55P03';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wlt_single_reconciliation_claim_trigger
BEFORE UPDATE OF reconciliation_status ON wlt_payout_requests
FOR EACH ROW
EXECUTE FUNCTION wlt_reject_duplicate_reconciliation_claim();

COMMENT ON TABLE wlt_finance_audit_events IS
  'Append-only audit truth for governed commission and settlement changes.';
COMMENT ON TABLE wlt_payout_audit_events IS
  'Append-only audit truth for payout destination, request, and reconciliation changes.';
COMMENT ON TABLE wlt_payout_outbox IS
  'Transactional payout notification outbox; delivery is external to financial state mutation.';
