-- WLT-107: OperatorContext-local commission policies, retries and adjustments.
--
-- WLT-102 and WLT-105 OperatorContext-scoped commission aggregates, evidence and the
-- double-entry ledger. This migration removes the remaining global policy and
-- idempotency authorities so two OperatorContexts may safely use the same business
-- identifiers without sharing policy state, retries or adjustment history.

BEGIN;

ALTER TABLE wlt_commission_policy_versions
  ADD COLUMN IF NOT EXISTS operator_context_id text;

WITH inferred_policy_OperatorContext AS (
  SELECT commission_policy_id AS policy_id, min(operator_context_id) AS operator_context_id
  FROM wlt_commissions
  WHERE commission_policy_id IS NOT NULL
    AND operator_context_id <> 'legacy-unscoped'
    AND btrim(operator_context_id) <> ''
  GROUP BY commission_policy_id
  HAVING count(DISTINCT operator_context_id) = 1
)
UPDATE wlt_commission_policy_versions policy
SET operator_context_id = inferred.operator_context_id
FROM inferred_policy_OperatorContext inferred
WHERE policy.policy_id = inferred.policy_id
  AND (policy.operator_context_id IS NULL OR btrim(policy.operator_context_id) = '');

UPDATE wlt_commission_policy_versions
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_commission_policy_versions
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_commission_policy_versions_pkey;
ALTER TABLE wlt_commission_policy_versions
  ADD CONSTRAINT wlt_commission_policy_versions_pkey
  PRIMARY KEY (operator_context_id, policy_id, version);
DROP INDEX IF EXISTS wlt_commission_policy_active_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS wlt_commission_policy_active_OperatorContext_uidx
  ON wlt_commission_policy_versions
    (operator_context_id, commission_type, source_type, beneficiary_actor_type)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS wlt_commission_policy_OperatorContext_history_idx
  ON wlt_commission_policy_versions (operator_context_id, policy_id, version DESC);

DROP INDEX IF EXISTS wlt_commissions_idempotency_idx;
CREATE UNIQUE INDEX IF NOT EXISTS wlt_commissions_operator_context_idempotency_idx
  ON wlt_commissions (operator_context_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE wlt_commission_adjustments
  ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_commission_adjustments adjustment
SET operator_context_id = commission.operator_context_id
FROM wlt_commissions commission
WHERE adjustment.commission_id = commission.id
  AND (adjustment.operator_context_id IS NULL OR btrim(adjustment.operator_context_id) = '');
UPDATE wlt_commission_adjustments
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_commission_adjustments
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_commission_adjustments
  DROP CONSTRAINT IF EXISTS wlt_commission_adjustments_idempotency_key_key;
DROP INDEX IF EXISTS wlt_commission_adjustments_request_hash_idx;
DROP INDEX IF EXISTS wlt_commission_adjustments_commission_created_idx;
CREATE UNIQUE INDEX IF NOT EXISTS wlt_commission_adjustments_operator_context_idempotency_uq
  ON wlt_commission_adjustments (operator_context_id, idempotency_key);
CREATE INDEX IF NOT EXISTS wlt_commission_adjustments_OperatorContext_request_hash_idx
  ON wlt_commission_adjustments (operator_context_id, request_hash);
CREATE INDEX IF NOT EXISTS wlt_commission_adjustments_OperatorContext_commission_created_idx
  ON wlt_commission_adjustments (operator_context_id, commission_id, created_at, id);

COMMENT ON COLUMN wlt_commission_policy_versions.operator_context_id IS
  'OperatorContext owning this versioned commission calculation policy.';
COMMENT ON COLUMN wlt_commission_adjustments.operator_context_id IS
  'OperatorContext owning this reasoned financial adjustment and its idempotency identity.';

COMMIT;
