-- WLT-112: tenant-local payout destinations, requests, audit, outbox and reconciliation.
--
-- Payout requests acquired tenant_id in WLT-102, while their destination,
-- idempotency, notification and reconciliation authorities remained global.
-- This convergence migration derives ownership from authoritative payout and
-- wallet truth, preserves ambiguous historical rows as legacy-unscoped, and
-- prevents a request from referencing another tenant's destination.

BEGIN;

ALTER TABLE wlt_payout_destinations
  ADD COLUMN IF NOT EXISTS tenant_id text;

WITH destination_request_owner AS (
  SELECT payout_destination_id AS destination_id, min(tenant_id) AS tenant_id
  FROM wlt_payout_requests
  WHERE payout_destination_id IS NOT NULL
    AND tenant_id <> 'legacy-unscoped'
    AND btrim(tenant_id) <> ''
  GROUP BY payout_destination_id
  HAVING count(DISTINCT tenant_id) = 1
)
UPDATE wlt_payout_destinations destination
SET tenant_id = owner.tenant_id
FROM destination_request_owner owner
WHERE destination.id = owner.destination_id
  AND (destination.tenant_id IS NULL OR btrim(destination.tenant_id) = '');

WITH destination_wallet_owner AS (
  SELECT owner_actor_type, owner_actor_id, min(wallet.tenant_id) AS tenant_id
  FROM wlt_payout_destinations destination
  JOIN wlt_wallets wallet
    ON wallet.actor_type = destination.owner_actor_type
   AND wallet.actor_id = destination.owner_actor_id
  WHERE wallet.tenant_id <> 'legacy-unscoped'
    AND btrim(wallet.tenant_id) <> ''
  GROUP BY owner_actor_type, owner_actor_id
  HAVING count(DISTINCT wallet.tenant_id) = 1
)
UPDATE wlt_payout_destinations destination
SET tenant_id = owner.tenant_id
FROM destination_wallet_owner owner
WHERE destination.owner_actor_type = owner.owner_actor_type
  AND destination.owner_actor_id = owner.owner_actor_id
  AND (destination.tenant_id IS NULL OR btrim(destination.tenant_id) = '');

UPDATE wlt_payout_destinations
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_payout_destinations
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_payout_destinations_partner_id_key;

DROP INDEX IF EXISTS wlt_payout_destinations_one_active_partner_idx;
DROP INDEX IF EXISTS wlt_payout_destinations_one_active_owner_idx;
DROP INDEX IF EXISTS wlt_payout_destinations_owner_created_idx;

ALTER TABLE wlt_payout_destinations
  ADD CONSTRAINT wlt_payout_destinations_tenant_id_key UNIQUE (tenant_id, id);
CREATE UNIQUE INDEX wlt_payout_destinations_one_active_tenant_owner_idx
  ON wlt_payout_destinations (tenant_id, owner_actor_type, owner_actor_id)
  WHERE active = true;
CREATE INDEX wlt_payout_destinations_tenant_owner_created_idx
  ON wlt_payout_destinations
    (tenant_id, owner_actor_type, owner_actor_id, created_at DESC);
CREATE INDEX wlt_payout_destinations_tenant_partner_idx
  ON wlt_payout_destinations (tenant_id, partner_id, created_at DESC);

ALTER TABLE wlt_payout_destination_requests
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_payout_destination_requests request
SET tenant_id = destination.tenant_id
FROM wlt_payout_destinations destination
WHERE request.payout_destination_id = destination.id
  AND (request.tenant_id IS NULL OR btrim(request.tenant_id) = '');

UPDATE wlt_payout_destination_requests
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_payout_destination_requests
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_payout_destination_requests_idempotency_key_key;
DROP INDEX IF EXISTS wlt_payout_destination_requests_owner_created_idx;
CREATE UNIQUE INDEX wlt_payout_destination_requests_tenant_idempotency_uq
  ON wlt_payout_destination_requests (tenant_id, idempotency_key);
CREATE INDEX wlt_payout_destination_requests_tenant_owner_created_idx
  ON wlt_payout_destination_requests
    (tenant_id, partner_id, created_at DESC);

DROP INDEX IF EXISTS wlt_payout_requests_idempotency_idx;
DROP INDEX IF EXISTS wlt_payout_requests_request_hash_idx;
CREATE UNIQUE INDEX wlt_payout_requests_tenant_idempotency_uq
  ON wlt_payout_requests (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX wlt_payout_requests_tenant_request_hash_idx
  ON wlt_payout_requests (tenant_id, request_hash)
  WHERE request_hash IS NOT NULL;
ALTER TABLE wlt_payout_requests
  ADD CONSTRAINT wlt_payout_requests_tenant_id_key UNIQUE (tenant_id, id);
ALTER TABLE wlt_payout_requests
  DROP CONSTRAINT IF EXISTS wlt_payout_requests_destination_tenant_fk;
ALTER TABLE wlt_payout_requests
  ADD CONSTRAINT wlt_payout_requests_destination_tenant_fk
  FOREIGN KEY (tenant_id, payout_destination_id)
  REFERENCES wlt_payout_destinations (tenant_id, id)
  ON DELETE RESTRICT;

ALTER TABLE wlt_payout_audit_events
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_payout_audit_events audit
SET tenant_id = request.tenant_id
FROM wlt_payout_requests request
WHERE audit.aggregate_id = request.id
  AND audit.aggregate_type IN ('payout_request','payout_reconciliation')
  AND (audit.tenant_id IS NULL OR btrim(audit.tenant_id) = '');
UPDATE wlt_payout_audit_events audit
SET tenant_id = destination.tenant_id
FROM wlt_payout_destinations destination
WHERE audit.aggregate_id = destination.id
  AND audit.aggregate_type = 'payout_destination'
  AND (audit.tenant_id IS NULL OR btrim(audit.tenant_id) = '');
UPDATE wlt_payout_audit_events
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_payout_audit_events
  ALTER COLUMN tenant_id SET NOT NULL;
DROP INDEX IF EXISTS wlt_payout_audit_aggregate_idx;
DROP INDEX IF EXISTS wlt_payout_audit_correlation_idx;
CREATE INDEX wlt_payout_audit_tenant_aggregate_idx
  ON wlt_payout_audit_events
    (tenant_id, aggregate_type, aggregate_id, created_at DESC);
CREATE INDEX wlt_payout_audit_tenant_correlation_idx
  ON wlt_payout_audit_events
    (tenant_id, correlation_id, created_at DESC);

ALTER TABLE wlt_payout_outbox
  ADD COLUMN IF NOT EXISTS tenant_id text;
UPDATE wlt_payout_outbox outbox
SET tenant_id = request.tenant_id
FROM wlt_payout_requests request
WHERE outbox.payout_request_id = request.id
  AND (outbox.tenant_id IS NULL OR btrim(outbox.tenant_id) = '');
UPDATE wlt_payout_outbox
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_payout_outbox
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_payout_outbox_payout_request_id_event_type_key;
CREATE UNIQUE INDEX wlt_payout_outbox_tenant_event_uq
  ON wlt_payout_outbox (tenant_id, payout_request_id, event_type);
DROP INDEX IF EXISTS wlt_payout_outbox_pending_idx;
CREATE INDEX wlt_payout_outbox_tenant_pending_idx
  ON wlt_payout_outbox (tenant_id, created_at, id)
  WHERE delivered_at IS NULL;
ALTER TABLE wlt_payout_outbox
  ADD CONSTRAINT wlt_payout_outbox_request_tenant_fk
  FOREIGN KEY (tenant_id, payout_request_id)
  REFERENCES wlt_payout_requests (tenant_id, id)
  ON DELETE RESTRICT;

ALTER TABLE wlt_payout_reconciliations
  ADD COLUMN IF NOT EXISTS tenant_id text;
UPDATE wlt_payout_reconciliations reconciliation
SET tenant_id = request.tenant_id
FROM wlt_payout_requests request
WHERE reconciliation.payout_request_id = request.id
  AND (reconciliation.tenant_id IS NULL OR btrim(reconciliation.tenant_id) = '');
UPDATE wlt_payout_reconciliations
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_payout_reconciliations
  ALTER COLUMN tenant_id SET NOT NULL;
DROP INDEX IF EXISTS wlt_payout_reconciliation_request_idx;
DROP INDEX IF EXISTS wlt_payout_reconciliation_single_claim_idx;
CREATE INDEX wlt_payout_reconciliation_tenant_request_idx
  ON wlt_payout_reconciliations
    (tenant_id, payout_request_id, created_at DESC);
CREATE UNIQUE INDEX wlt_payout_reconciliation_tenant_single_claim_idx
  ON wlt_payout_reconciliations (tenant_id, payout_request_id)
  WHERE resolved_at IS NULL;
ALTER TABLE wlt_payout_reconciliations
  ADD CONSTRAINT wlt_payout_reconciliation_request_tenant_fk
  FOREIGN KEY (tenant_id, payout_request_id)
  REFERENCES wlt_payout_requests (tenant_id, id)
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
  WHERE tenant_id = NEW.tenant_id AND id = NEW.payout_request_id;

  IF payout_status IS NULL THEN
    RAISE EXCEPTION 'payout request % does not belong to tenant %', NEW.payout_request_id, NEW.tenant_id;
  END IF;
  IF payout_status NOT IN ('provider_result_unknown','provider_pending') THEN
    RAISE EXCEPTION 'payout % is not eligible for reconciliation claim from status %', NEW.payout_request_id, payout_status;
  END IF;

  SELECT count(*) INTO active_claims
  FROM wlt_payout_reconciliations
  WHERE tenant_id = NEW.tenant_id
    AND payout_request_id = NEW.payout_request_id
    AND resolved_at IS NULL;
  IF active_claims > 0 THEN
    RAISE EXCEPTION 'payout request % already has an active reconciliation claim in tenant %', NEW.payout_request_id, NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN wlt_payout_destinations.tenant_id IS
  'Tenant owning encrypted payout destination truth.';
COMMENT ON COLUMN wlt_payout_destination_requests.tenant_id IS
  'Tenant-local destination mutation idempotency identity.';
COMMENT ON COLUMN wlt_payout_outbox.tenant_id IS
  'Tenant copied from the payout request for isolated notification delivery.';
COMMENT ON COLUMN wlt_payout_reconciliations.tenant_id IS
  'Tenant copied from the payout request for isolated provider inquiry evidence.';

COMMIT;
