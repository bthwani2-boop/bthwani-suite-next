-- WLT-112: OperatorContext-local payout destinations, requests, audit, outbox and reconciliation.
--
-- Payout requests acquired operator_context_id in WLT-102, while their destination,
-- idempotency, notification and reconciliation authorities remained global.
-- This convergence migration derives ownership from authoritative payout and
-- wallet truth, preserves ambiguous historical rows as legacy-unscoped, and
-- prevents a request from referencing another OperatorContext's destination.

BEGIN;

ALTER TABLE wlt_payout_destinations
  ADD COLUMN IF NOT EXISTS operator_context_id text;

WITH destination_request_owner AS (
  SELECT payout_destination_id AS destination_id, min(operator_context_id) AS operator_context_id
  FROM wlt_payout_requests
  WHERE payout_destination_id IS NOT NULL
    AND operator_context_id <> 'legacy-unscoped'
    AND btrim(operator_context_id) <> ''
  GROUP BY payout_destination_id
  HAVING count(DISTINCT operator_context_id) = 1
)
UPDATE wlt_payout_destinations destination
SET operator_context_id = owner.operator_context_id
FROM destination_request_owner owner
WHERE destination.id = owner.destination_id
  AND (destination.operator_context_id IS NULL OR btrim(destination.operator_context_id) = '');

WITH destination_wallet_owner AS (
  SELECT owner_actor_type, owner_actor_id, min(wallet.operator_context_id) AS operator_context_id
  FROM wlt_payout_destinations destination
  JOIN wlt_wallets wallet
    ON wallet.actor_type = destination.owner_actor_type
   AND wallet.actor_id = destination.owner_actor_id
  WHERE wallet.operator_context_id <> 'legacy-unscoped'
    AND btrim(wallet.operator_context_id) <> ''
  GROUP BY owner_actor_type, owner_actor_id
  HAVING count(DISTINCT wallet.operator_context_id) = 1
)
UPDATE wlt_payout_destinations destination
SET operator_context_id = owner.operator_context_id
FROM destination_wallet_owner owner
WHERE destination.owner_actor_type = owner.owner_actor_type
  AND destination.owner_actor_id = owner.owner_actor_id
  AND (destination.operator_context_id IS NULL OR btrim(destination.operator_context_id) = '');

UPDATE wlt_payout_destinations
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_payout_destinations
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_payout_destinations_partner_id_key;

DROP INDEX IF EXISTS wlt_payout_destinations_one_active_partner_idx;
DROP INDEX IF EXISTS wlt_payout_destinations_one_active_owner_idx;
DROP INDEX IF EXISTS wlt_payout_destinations_owner_created_idx;

ALTER TABLE wlt_payout_destinations
  DROP CONSTRAINT IF EXISTS wlt_payout_destinations_operator_context_id_key CASCADE;

ALTER TABLE wlt_payout_destinations
  ADD CONSTRAINT wlt_payout_destinations_operator_context_id_key UNIQUE (operator_context_id, id);
CREATE UNIQUE INDEX wlt_payout_destinations_one_active_OperatorContext_owner_idx
  ON wlt_payout_destinations (operator_context_id, owner_actor_type, owner_actor_id)
  WHERE active = true;
CREATE INDEX wlt_payout_destinations_OperatorContext_owner_created_idx
  ON wlt_payout_destinations
    (operator_context_id, owner_actor_type, owner_actor_id, created_at DESC);
CREATE INDEX wlt_payout_destinations_OperatorContext_partner_idx
  ON wlt_payout_destinations (operator_context_id, partner_id, created_at DESC);

ALTER TABLE wlt_payout_destination_requests
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_payout_destination_requests request
SET operator_context_id = destination.operator_context_id
FROM wlt_payout_destinations destination
WHERE request.payout_destination_id = destination.id
  AND (request.operator_context_id IS NULL OR btrim(request.operator_context_id) = '');

UPDATE wlt_payout_destination_requests
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_payout_destination_requests
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_payout_destination_requests_idempotency_key_key;
DROP INDEX IF EXISTS wlt_payout_destination_requests_owner_created_idx;
CREATE UNIQUE INDEX wlt_payout_destination_requests_operator_context_idempotency_uq
  ON wlt_payout_destination_requests (operator_context_id, idempotency_key);
CREATE INDEX wlt_payout_destination_requests_OperatorContext_owner_created_idx
  ON wlt_payout_destination_requests
    (operator_context_id, partner_id, created_at DESC);

DROP INDEX IF EXISTS wlt_payout_requests_idempotency_idx;
DROP INDEX IF EXISTS wlt_payout_requests_request_hash_idx;
CREATE UNIQUE INDEX wlt_payout_requests_operator_context_idempotency_uq
  ON wlt_payout_requests (operator_context_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX wlt_payout_requests_OperatorContext_request_hash_idx
  ON wlt_payout_requests (operator_context_id, request_hash)
  WHERE request_hash IS NOT NULL;
ALTER TABLE wlt_payout_requests
  DROP CONSTRAINT IF EXISTS wlt_payout_requests_operator_context_id_key CASCADE;

ALTER TABLE wlt_payout_requests
  ADD CONSTRAINT wlt_payout_requests_operator_context_id_key UNIQUE (operator_context_id, id);
ALTER TABLE wlt_payout_requests
  DROP CONSTRAINT IF EXISTS wlt_payout_requests_destination_OperatorContext_fk;
ALTER TABLE wlt_payout_requests
  ADD CONSTRAINT wlt_payout_requests_destination_OperatorContext_fk
  FOREIGN KEY (operator_context_id, payout_destination_id)
  REFERENCES wlt_payout_destinations (operator_context_id, id)
  ON DELETE RESTRICT;

ALTER TABLE wlt_payout_audit_events
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_payout_audit_events audit
SET operator_context_id = request.operator_context_id
FROM wlt_payout_requests request
WHERE audit.aggregate_id = request.id
  AND audit.aggregate_type IN ('payout_request','payout_reconciliation')
  AND (audit.operator_context_id IS NULL OR btrim(audit.operator_context_id) = '');
UPDATE wlt_payout_audit_events audit
SET operator_context_id = destination.operator_context_id
FROM wlt_payout_destinations destination
WHERE audit.aggregate_id = destination.id
  AND audit.aggregate_type = 'payout_destination'
  AND (audit.operator_context_id IS NULL OR btrim(audit.operator_context_id) = '');
UPDATE wlt_payout_audit_events
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_payout_audit_events
  ALTER COLUMN operator_context_id SET NOT NULL;
DROP INDEX IF EXISTS wlt_payout_audit_aggregate_idx;
DROP INDEX IF EXISTS wlt_payout_audit_correlation_idx;
CREATE INDEX wlt_payout_audit_OperatorContext_aggregate_idx
  ON wlt_payout_audit_events
    (operator_context_id, aggregate_type, aggregate_id, created_at DESC);
CREATE INDEX wlt_payout_audit_OperatorContext_correlation_idx
  ON wlt_payout_audit_events
    (operator_context_id, correlation_id, created_at DESC);

ALTER TABLE wlt_payout_outbox
  ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_payout_outbox outbox
SET operator_context_id = request.operator_context_id
FROM wlt_payout_requests request
WHERE outbox.payout_request_id = request.id
  AND (outbox.operator_context_id IS NULL OR btrim(outbox.operator_context_id) = '');
UPDATE wlt_payout_outbox
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_payout_outbox
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_payout_outbox_payout_request_id_event_type_key;
CREATE UNIQUE INDEX wlt_payout_outbox_OperatorContext_event_uq
  ON wlt_payout_outbox (operator_context_id, payout_request_id, event_type);
DROP INDEX IF EXISTS wlt_payout_outbox_pending_idx;
CREATE INDEX wlt_payout_outbox_OperatorContext_pending_idx
  ON wlt_payout_outbox (operator_context_id, created_at, id)
  WHERE delivered_at IS NULL;
ALTER TABLE wlt_payout_outbox
  DROP CONSTRAINT IF EXISTS wlt_payout_outbox_request_OperatorContext_fk;

ALTER TABLE wlt_payout_outbox
  ADD CONSTRAINT wlt_payout_outbox_request_OperatorContext_fk
  FOREIGN KEY (operator_context_id, payout_request_id)
  REFERENCES wlt_payout_requests (operator_context_id, id)
  ON DELETE RESTRICT;

ALTER TABLE wlt_payout_reconciliations
  ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_payout_reconciliations reconciliation
SET operator_context_id = request.operator_context_id
FROM wlt_payout_requests request
WHERE reconciliation.payout_request_id = request.id
  AND (reconciliation.operator_context_id IS NULL OR btrim(reconciliation.operator_context_id) = '');
UPDATE wlt_payout_reconciliations
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_payout_reconciliations
  ALTER COLUMN operator_context_id SET NOT NULL;
DROP INDEX IF EXISTS wlt_payout_reconciliation_request_idx;
DROP INDEX IF EXISTS wlt_payout_reconciliation_single_claim_idx;
CREATE INDEX wlt_payout_reconciliation_OperatorContext_request_idx
  ON wlt_payout_reconciliations
    (operator_context_id, payout_request_id, created_at DESC);
CREATE UNIQUE INDEX wlt_payout_reconciliation_OperatorContext_single_claim_idx
  ON wlt_payout_reconciliations (operator_context_id, payout_request_id)
  WHERE resolved_at IS NULL;
ALTER TABLE wlt_payout_reconciliations
  DROP CONSTRAINT IF EXISTS wlt_payout_reconciliation_request_OperatorContext_fk;

ALTER TABLE wlt_payout_reconciliations
  ADD CONSTRAINT wlt_payout_reconciliation_request_OperatorContext_fk
  FOREIGN KEY (operator_context_id, payout_request_id)
  REFERENCES wlt_payout_requests (operator_context_id, id)
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION wlt_assert_reconciliation_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payout_status text;
  active_claims integer;
BEGIN
  SELECT status INTO payout_status
  FROM wlt_payout_requests
  WHERE operator_context_id = NEW.operator_context_id AND id = NEW.payout_request_id;

  IF payout_status IS NULL THEN
    RAISE EXCEPTION 'payout request % does not belong to OperatorContext %', NEW.payout_request_id, NEW.operator_context_id;
  END IF;
  IF payout_status NOT IN ('provider_result_unknown','provider_pending') THEN
    RAISE EXCEPTION 'payout % is not eligible for reconciliation claim from status %', NEW.payout_request_id, payout_status;
  END IF;

  SELECT count(*) INTO active_claims
  FROM wlt_payout_reconciliations
  WHERE operator_context_id = NEW.operator_context_id
    AND payout_request_id = NEW.payout_request_id
    AND resolved_at IS NULL;
  IF active_claims > 0 THEN
    RAISE EXCEPTION 'payout request % already has an active reconciliation claim in OperatorContext %', NEW.payout_request_id, NEW.operator_context_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN wlt_payout_destinations.operator_context_id IS
  'OperatorContext owning encrypted payout destination truth.';
COMMENT ON COLUMN wlt_payout_destination_requests.operator_context_id IS
  'OperatorContext-local destination mutation idempotency identity.';
COMMENT ON COLUMN wlt_payout_outbox.operator_context_id IS
  'OperatorContext copied from the payout request for isolated notification delivery.';
COMMENT ON COLUMN wlt_payout_reconciliations.operator_context_id IS
  'OperatorContext copied from the payout request for isolated provider inquiry evidence.';

COMMIT;
