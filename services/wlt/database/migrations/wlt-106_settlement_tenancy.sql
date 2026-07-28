-- WLT-106: tenant-local settlement policy, evidence and idempotency truth.
--
-- WLT-102 tenant-scoped the settlement aggregate itself. This convergence
-- migration carries the same trusted ownership into every settlements-commissions settlement
-- support table so policy versions, source evidence and retries cannot collide
-- or leak across tenants. Historical rows without one provable owner remain
-- explicitly legacy-unscoped and are never selected by active-SaaS code.

BEGIN;

ALTER TABLE wlt_settlement_policies
  ADD COLUMN IF NOT EXISTS tenant_id text;

WITH inferred_partner_tenant AS (
  SELECT partner_id, min(tenant_id) AS tenant_id
  FROM wlt_settlements
  WHERE tenant_id <> 'legacy-unscoped' AND btrim(tenant_id) <> ''
  GROUP BY partner_id
  HAVING count(DISTINCT tenant_id) = 1
)
UPDATE wlt_settlement_policies policy
SET tenant_id = inferred.tenant_id
FROM inferred_partner_tenant inferred
WHERE policy.partner_id = inferred.partner_id
  AND (policy.tenant_id IS NULL OR btrim(policy.tenant_id) = '');

UPDATE wlt_settlement_policies
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_settlement_policies
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_policies_pkey;
ALTER TABLE wlt_settlement_policies
  ADD CONSTRAINT wlt_settlement_policies_pkey PRIMARY KEY (tenant_id, partner_id);
CREATE INDEX wlt_settlement_policies_tenant_status_idx
  ON wlt_settlement_policies (tenant_id, status, partner_id);

ALTER TABLE wlt_settlement_policy_versions
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_settlement_policy_versions version
SET tenant_id = policy.tenant_id
FROM wlt_settlement_policies policy
WHERE version.partner_id = policy.partner_id
  AND policy.tenant_id <> 'legacy-unscoped'
  AND (version.tenant_id IS NULL OR btrim(version.tenant_id) = '');

UPDATE wlt_settlement_policy_versions
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_settlement_policy_versions
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_policy_versions_pkey;
ALTER TABLE wlt_settlement_policy_versions
  ADD CONSTRAINT wlt_settlement_policy_versions_pkey
  PRIMARY KEY (tenant_id, partner_id, version);
DROP INDEX IF EXISTS wlt_settlement_policy_current_idx;
CREATE INDEX wlt_settlement_policy_tenant_current_idx
  ON wlt_settlement_policy_versions (tenant_id, partner_id, version DESC);

ALTER TABLE wlt_settlement_source_orders
  ADD COLUMN IF NOT EXISTS tenant_id text;
UPDATE wlt_settlement_source_orders source
SET tenant_id = settlement.tenant_id
FROM wlt_settlements settlement
WHERE source.settlement_id = settlement.id
  AND (source.tenant_id IS NULL OR btrim(source.tenant_id) = '');
UPDATE wlt_settlement_source_orders
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_settlement_source_orders
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_source_orders_pkey;
ALTER TABLE wlt_settlement_source_orders
  ADD CONSTRAINT wlt_settlement_source_orders_pkey PRIMARY KEY (tenant_id, order_id);
CREATE INDEX wlt_settlement_source_orders_tenant_settlement_idx
  ON wlt_settlement_source_orders (tenant_id, settlement_id, order_id);
CREATE INDEX wlt_settlement_source_orders_tenant_partner_period_idx
  ON wlt_settlement_source_orders (tenant_id, partner_id, delivered_at DESC);

ALTER TABLE wlt_settlement_source_evidence
  ADD COLUMN IF NOT EXISTS tenant_id text;
UPDATE wlt_settlement_source_evidence evidence
SET tenant_id = settlement.tenant_id
FROM wlt_settlements settlement
WHERE evidence.settlement_id = settlement.id
  AND (evidence.tenant_id IS NULL OR btrim(evidence.tenant_id) = '');
UPDATE wlt_settlement_source_evidence
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_settlement_source_evidence
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_source_evidence_pkey;
ALTER TABLE wlt_settlement_source_evidence
  ADD CONSTRAINT wlt_settlement_source_evidence_pkey
  PRIMARY KEY (tenant_id, order_id);
DROP INDEX IF EXISTS wlt_settlement_completion_event_uidx;
CREATE UNIQUE INDEX wlt_settlement_completion_event_tenant_uidx
  ON wlt_settlement_source_evidence (tenant_id, completion_event_id);
CREATE INDEX wlt_settlement_evidence_tenant_settlement_idx
  ON wlt_settlement_source_evidence (tenant_id, settlement_id, order_id);

ALTER TABLE wlt_settlement_requests
  ADD COLUMN IF NOT EXISTS tenant_id text;
UPDATE wlt_settlement_requests request
SET tenant_id = settlement.tenant_id
FROM wlt_settlements settlement
WHERE request.settlement_id = settlement.id
  AND (request.tenant_id IS NULL OR btrim(request.tenant_id) = '');
UPDATE wlt_settlement_requests
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_settlement_requests
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_requests_pkey;
ALTER TABLE wlt_settlement_requests
  ADD CONSTRAINT wlt_settlement_requests_pkey
  PRIMARY KEY (tenant_id, idempotency_key);
DROP INDEX IF EXISTS wlt_settlement_request_hash_uidx;
CREATE UNIQUE INDEX wlt_settlement_request_tenant_hash_uidx
  ON wlt_settlement_requests (tenant_id, request_hash);
CREATE INDEX wlt_settlement_request_tenant_partner_idx
  ON wlt_settlement_requests (tenant_id, partner_id, created_at DESC);

COMMENT ON COLUMN wlt_settlement_policies.tenant_id IS
  'Tenant owning the settlement policy; active runtime never falls back to legacy-unscoped.';
COMMENT ON COLUMN wlt_settlement_requests.tenant_id IS
  'Tenant-local idempotency and request evidence identity.';
COMMENT ON COLUMN wlt_settlement_source_evidence.tenant_id IS
  'Tenant owning immutable DSH settlement evidence.';

COMMIT;
