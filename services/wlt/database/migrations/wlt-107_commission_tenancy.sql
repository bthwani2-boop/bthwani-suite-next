-- WLT-107: tenant-local commission policies, retries and adjustments.
--
-- WLT-102 and WLT-105 tenant-scoped commission aggregates, evidence and the
-- double-entry ledger. This migration removes the remaining global policy and
-- idempotency authorities so two tenants may safely use the same business
-- identifiers without sharing policy state, retries or adjustment history.

BEGIN;

ALTER TABLE wlt_commission_policy_versions
  ADD COLUMN IF NOT EXISTS tenant_id text;

WITH inferred_policy_tenant AS (
  SELECT commission_policy_id AS policy_id, min(tenant_id) AS tenant_id
  FROM wlt_commissions
  WHERE commission_policy_id IS NOT NULL
    AND tenant_id <> 'legacy-unscoped'
    AND btrim(tenant_id) <> ''
  GROUP BY commission_policy_id
  HAVING count(DISTINCT tenant_id) = 1
)
UPDATE wlt_commission_policy_versions policy
SET tenant_id = inferred.tenant_id
FROM inferred_policy_tenant inferred
WHERE policy.policy_id = inferred.policy_id
  AND (policy.tenant_id IS NULL OR btrim(policy.tenant_id) = '');

UPDATE wlt_commission_policy_versions
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_commission_policy_versions
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_commission_policy_versions_pkey;
ALTER TABLE wlt_commission_policy_versions
  ADD CONSTRAINT wlt_commission_policy_versions_pkey
  PRIMARY KEY (tenant_id, policy_id, version);
DROP INDEX IF EXISTS wlt_commission_policy_active_uidx;
CREATE UNIQUE INDEX wlt_commission_policy_active_tenant_uidx
  ON wlt_commission_policy_versions
    (tenant_id, commission_type, source_type, beneficiary_actor_type)
  WHERE status = 'active';
CREATE INDEX wlt_commission_policy_tenant_history_idx
  ON wlt_commission_policy_versions (tenant_id, policy_id, version DESC);

DROP INDEX IF EXISTS wlt_commissions_idempotency_idx;
CREATE UNIQUE INDEX wlt_commissions_tenant_idempotency_idx
  ON wlt_commissions (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE wlt_commission_adjustments
  ADD COLUMN IF NOT EXISTS tenant_id text;
UPDATE wlt_commission_adjustments adjustment
SET tenant_id = commission.tenant_id
FROM wlt_commissions commission
WHERE adjustment.commission_id = commission.id
  AND (adjustment.tenant_id IS NULL OR btrim(adjustment.tenant_id) = '');
UPDATE wlt_commission_adjustments
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_commission_adjustments
  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE wlt_commission_adjustments
  DROP CONSTRAINT IF EXISTS wlt_commission_adjustments_idempotency_key_key;
DROP INDEX IF EXISTS wlt_commission_adjustments_request_hash_idx;
DROP INDEX IF EXISTS wlt_commission_adjustments_commission_created_idx;
CREATE UNIQUE INDEX wlt_commission_adjustments_tenant_idempotency_uq
  ON wlt_commission_adjustments (tenant_id, idempotency_key);
CREATE INDEX wlt_commission_adjustments_tenant_request_hash_idx
  ON wlt_commission_adjustments (tenant_id, request_hash);
CREATE INDEX wlt_commission_adjustments_tenant_commission_created_idx
  ON wlt_commission_adjustments (tenant_id, commission_id, created_at, id);

COMMENT ON COLUMN wlt_commission_policy_versions.tenant_id IS
  'Tenant owning this versioned commission calculation policy.';
COMMENT ON COLUMN wlt_commission_adjustments.tenant_id IS
  'Tenant owning this reasoned financial adjustment and its idempotency identity.';

COMMIT;
