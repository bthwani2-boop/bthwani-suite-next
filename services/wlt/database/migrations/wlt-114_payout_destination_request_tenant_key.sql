BEGIN;

-- The original request table used (partner_id, idempotency_key) as its primary
-- key. That global identity prevents the same actor and retry key from being
-- used independently in two tenants. Tenancy is now mandatory, so the durable
-- request identity must be tenant-local as well.
ALTER TABLE wlt_payout_destination_requests
  DROP CONSTRAINT IF EXISTS wlt_payout_destination_requests_pkey;

DROP INDEX IF EXISTS wlt_payout_destination_requests_tenant_key_uq;

ALTER TABLE wlt_payout_destination_requests
  ADD CONSTRAINT wlt_payout_destination_requests_pkey
  PRIMARY KEY (tenant_id, idempotency_key);

CREATE INDEX IF NOT EXISTS wlt_payout_destination_requests_tenant_owner_idx
  ON wlt_payout_destination_requests (tenant_id, partner_id, idempotency_key);

COMMIT;
