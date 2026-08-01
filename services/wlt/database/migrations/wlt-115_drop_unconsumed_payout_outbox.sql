-- WLT-115: Drop wlt_payout_outbox (D4 remediation).
--
-- wlt_payout_outbox has been write-only since its introduction (wlt-098):
-- both the wlt_capture_payout_transition() trigger and the Go-side
-- enqueuePayoutEvent() append rows, but no worker, consumer, or query ever
-- claims/reads/deletes them (verified: only DELETE is in a test fixture
-- cleanup). Every payout lifecycle transition this table would have notified
-- on is already durably captured, losslessly, in wlt_payout_audit_events by
-- the same trigger transaction -- so no historical evidence is lost by
-- removing the outbox. A real actor-facing payout notification pipeline
-- (mirroring internal/dshoutbox) is a legitimate future feature, but it
-- needs its own DSH-side endpoint, contract and end-to-end verification; it
-- is out of scope for closing this dead-producer gap.

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

  RETURN NEW;
END;
$$;

DROP TABLE IF EXISTS wlt_payout_outbox;
