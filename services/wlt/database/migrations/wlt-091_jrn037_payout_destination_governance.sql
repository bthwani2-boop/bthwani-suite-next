-- WLT-091 / JRN-037: typed payout destinations, destination-bound requests,
-- payout-specific audit, notification outbox and reconciliation evidence.
--
-- This migration is additive. Existing partner destinations are backfilled as
-- actor_type=partner while raw destination values remain governed by WLT-018.

ALTER TABLE wlt_payout_destinations
  ADD COLUMN IF NOT EXISTS owner_actor_id text,
  ADD COLUMN IF NOT EXISTS owner_actor_type text;

UPDATE wlt_payout_destinations
SET owner_actor_id = partner_id,
    owner_actor_type = 'partner'
WHERE owner_actor_id IS NULL OR owner_actor_type IS NULL;

ALTER TABLE wlt_payout_destinations
  ALTER COLUMN owner_actor_id SET NOT NULL,
  ALTER COLUMN owner_actor_type SET NOT NULL;

ALTER TABLE wlt_payout_destinations
  DROP CONSTRAINT IF EXISTS wlt_payout_destinations_owner_actor_type_chk;
ALTER TABLE wlt_payout_destinations
  ADD CONSTRAINT wlt_payout_destinations_owner_actor_type_chk
  CHECK (owner_actor_type IN ('partner','captain','field'));

DROP INDEX IF EXISTS wlt_payout_destinations_partner_idx;
CREATE INDEX IF NOT EXISTS wlt_payout_destinations_owner_history_idx
  ON wlt_payout_destinations(owner_actor_type, owner_actor_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wlt_payout_destinations_one_active_owner_uidx
  ON wlt_payout_destinations(owner_actor_type, owner_actor_id)
  WHERE active = true;

ALTER TABLE wlt_payout_requests
  ADD COLUMN IF NOT EXISTS payout_destination_id text,
  ADD COLUMN IF NOT EXISTS request_hash text,
  ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by_operator_id text;

ALTER TABLE wlt_payout_requests
  DROP CONSTRAINT IF EXISTS wlt_payout_requests_reconciliation_status_chk;
ALTER TABLE wlt_payout_requests
  ADD CONSTRAINT wlt_payout_requests_reconciliation_status_chk
  CHECK (reconciliation_status IN ('not_required','required','inquiry_pending','resolved_success','resolved_failed'));

CREATE INDEX IF NOT EXISTS wlt_payout_requests_destination_idx
  ON wlt_payout_requests(payout_destination_id, requested_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wlt_payout_requests_request_hash_uidx
  ON wlt_payout_requests(request_hash)
  WHERE request_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS wlt_jrn037_payout_audit_events (
  id text PRIMARY KEY DEFAULT ('wpa37_' || gen_random_uuid()::text),
  aggregate_type text NOT NULL CHECK (aggregate_type IN ('payout_destination','payout_request','payout_reconciliation')),
  aggregate_id text NOT NULL CHECK (btrim(aggregate_id) <> ''),
  action text NOT NULL CHECK (btrim(action) <> ''),
  actor_id text NOT NULL CHECK (btrim(actor_id) <> ''),
  actor_type text NOT NULL CHECK (btrim(actor_type) <> ''),
  reason text NOT NULL DEFAULT '',
  correlation_id text NOT NULL CHECK (btrim(correlation_id) <> ''),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wlt_jrn037_payout_audit_aggregate_idx
  ON wlt_jrn037_payout_audit_events(aggregate_type, aggregate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wlt_jrn037_payout_audit_correlation_idx
  ON wlt_jrn037_payout_audit_events(correlation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wlt_jrn037_payout_outbox (
  id text PRIMARY KEY DEFAULT ('wpo37_' || gen_random_uuid()::text),
  payout_request_id text NOT NULL REFERENCES wlt_payout_requests(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'payout.requested','payout.approved','payout.rejected','payout.provider_pending',
    'payout.provider_unknown','payout.processing','payout.completed','payout.failed','payout.reconciled'
  )),
  recipient_actor_id text NOT NULL CHECK (btrim(recipient_actor_id) <> ''),
  recipient_actor_type text NOT NULL CHECK (recipient_actor_type IN ('partner','captain','field')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text NOT NULL CHECK (btrim(correlation_id) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  UNIQUE (payout_request_id, event_type)
);

CREATE INDEX IF NOT EXISTS wlt_jrn037_payout_outbox_pending_idx
  ON wlt_jrn037_payout_outbox(created_at, id)
  WHERE delivered_at IS NULL;

CREATE TABLE IF NOT EXISTS wlt_jrn037_payout_reconciliations (
  id text PRIMARY KEY DEFAULT ('wpr37_' || gen_random_uuid()::text),
  payout_request_id text NOT NULL REFERENCES wlt_payout_requests(id) ON DELETE RESTRICT,
  provider_reference text NOT NULL DEFAULT '',
  inquiry_status text NOT NULL CHECK (inquiry_status IN ('pending','succeeded','failed','unknown')),
  provider_status text NOT NULL DEFAULT '',
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  operator_id text NOT NULL CHECK (btrim(operator_id) <> ''),
  correlation_id text NOT NULL CHECK (btrim(correlation_id) <> ''),
  resolution_action text NOT NULL DEFAULT '' CHECK (resolution_action IN ('','confirmed_success','confirmed_failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS wlt_jrn037_payout_reconciliation_request_idx
  ON wlt_jrn037_payout_reconciliations(payout_request_id, created_at DESC);

-- Existing sovereign transition handlers already update the payout row and
-- wallet/ledger in one transaction. This trigger appends the corresponding
-- audit/outbox evidence in that same transaction, including legacy transition
-- handlers that predate JRN-037. It cannot release or move funds itself.
CREATE OR REPLACE FUNCTION wlt_jrn037_capture_payout_transition()
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
    WHEN transition_actor_id = NEW.beneficiary_actor_id THEN NEW.beneficiary_actor_type
    ELSE 'operator'
  END;
  transition_correlation := COALESCE(NULLIF(NEW.idempotency_key, ''), 'payout:' || NEW.id || ':' || NEW.status);

  IF NEW.status = 'provider_result_unknown' AND NEW.reconciliation_status = 'not_required' THEN
    NEW.reconciliation_status := 'required';
  END IF;

  INSERT INTO wlt_jrn037_payout_audit_events
    (aggregate_type, aggregate_id, action, actor_id, actor_type, reason, correlation_id, metadata)
  VALUES (
    'payout_request', NEW.id, event_name, transition_actor_id, transition_actor_type,
    COALESCE(NEW.failure_reason, ''), transition_correlation,
    jsonb_build_object(
      'previousStatus', OLD.status,
      'status', NEW.status,
      'payoutDestinationId', NEW.payout_destination_id,
      'providerReference', COALESCE(NEW.provider_reference, ''),
      'providerStatus', COALESCE(NEW.provider_status, '')
    )
  );

  INSERT INTO wlt_jrn037_payout_outbox
    (payout_request_id, event_type, recipient_actor_id, recipient_actor_type, payload, correlation_id)
  VALUES (
    NEW.id, event_name, NEW.beneficiary_actor_id, NEW.beneficiary_actor_type,
    jsonb_build_object('status', NEW.status, 'amountMinorUnits', NEW.amount_minor_units, 'currency', NEW.currency),
    transition_correlation
  )
  ON CONFLICT (payout_request_id, event_type) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_jrn037_payout_transition_trigger ON wlt_payout_requests;
CREATE TRIGGER wlt_jrn037_payout_transition_trigger
BEFORE UPDATE OF status ON wlt_payout_requests
FOR EACH ROW
EXECUTE FUNCTION wlt_jrn037_capture_payout_transition();

COMMENT ON TABLE wlt_jrn037_payout_audit_events IS
  'Append-only JRN-037 audit for destination, payout and reconciliation lifecycle changes.';
COMMENT ON TABLE wlt_jrn037_payout_outbox IS
  'Transactional notification outbox; delivery is external to the financial state transaction.';
COMMENT ON TABLE wlt_jrn037_payout_reconciliations IS
  'Provider inquiry evidence for ambiguous payout outcomes; unknown results never release funds directly.';
