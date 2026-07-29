-- WLT-106: OperatorContext-local settlement policy, evidence and idempotency truth.
--
-- WLT-102 OperatorContext-scoped the settlement aggregate itself. This convergence
-- migration carries the same trusted ownership into every  settlement
-- support table so policy versions, source evidence and retries cannot collide
-- or leak across OperatorContexts. Historical rows without one provable owner remain
-- explicitly legacy-unscoped and are never selected by active-SaaS code.

BEGIN;

ALTER TABLE wlt_settlement_policies
  ADD COLUMN IF NOT EXISTS operator_context_id text;

WITH inferred_partner_OperatorContext AS (
  SELECT partner_id, min(operator_context_id) AS operator_context_id
  FROM wlt_settlements
  WHERE operator_context_id <> 'legacy-unscoped' AND btrim(operator_context_id) <> ''
  GROUP BY partner_id
  HAVING count(DISTINCT operator_context_id) = 1
)
UPDATE wlt_settlement_policies policy
SET operator_context_id = inferred.operator_context_id
FROM inferred_partner_OperatorContext inferred
WHERE policy.partner_id = inferred.partner_id
  AND (policy.operator_context_id IS NULL OR btrim(policy.operator_context_id) = '');

UPDATE wlt_settlement_policies
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_settlement_policies
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_policies_pkey;
ALTER TABLE wlt_settlement_policies
  ADD CONSTRAINT wlt_settlement_policies_pkey PRIMARY KEY (operator_context_id, partner_id);
CREATE INDEX wlt_settlement_policies_OperatorContext_status_idx
  ON wlt_settlement_policies (operator_context_id, status, partner_id);

ALTER TABLE wlt_settlement_policy_versions
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_settlement_policy_versions version
SET operator_context_id = policy.operator_context_id
FROM wlt_settlement_policies policy
WHERE version.partner_id = policy.partner_id
  AND policy.operator_context_id <> 'legacy-unscoped'
  AND (version.operator_context_id IS NULL OR btrim(version.operator_context_id) = '');

UPDATE wlt_settlement_policy_versions
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_settlement_policy_versions
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_policy_versions_pkey;
ALTER TABLE wlt_settlement_policy_versions
  ADD CONSTRAINT wlt_settlement_policy_versions_pkey
  PRIMARY KEY (operator_context_id, partner_id, version);
DROP INDEX IF EXISTS wlt_settlement_policy_current_idx;
CREATE INDEX wlt_settlement_policy_OperatorContext_current_idx
  ON wlt_settlement_policy_versions (operator_context_id, partner_id, version DESC);

ALTER TABLE wlt_settlement_source_orders
  ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_settlement_source_orders source
SET operator_context_id = settlement.operator_context_id
FROM wlt_settlements settlement
WHERE source.settlement_id = settlement.id
  AND (source.operator_context_id IS NULL OR btrim(source.operator_context_id) = '');
UPDATE wlt_settlement_source_orders
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_settlement_source_orders
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_source_orders_pkey;
ALTER TABLE wlt_settlement_source_orders
  ADD CONSTRAINT wlt_settlement_source_orders_pkey PRIMARY KEY (operator_context_id, order_id);
CREATE INDEX wlt_settlement_source_orders_OperatorContext_settlement_idx
  ON wlt_settlement_source_orders (operator_context_id, settlement_id, order_id);
CREATE INDEX wlt_settlement_source_orders_OperatorContext_partner_period_idx
  ON wlt_settlement_source_orders (operator_context_id, partner_id, delivered_at DESC);

ALTER TABLE wlt_settlement_source_evidence
  ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_settlement_source_evidence evidence
SET operator_context_id = settlement.operator_context_id
FROM wlt_settlements settlement
WHERE evidence.settlement_id = settlement.id
  AND (evidence.operator_context_id IS NULL OR btrim(evidence.operator_context_id) = '');
UPDATE wlt_settlement_source_evidence
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_settlement_source_evidence
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_source_evidence_pkey;
ALTER TABLE wlt_settlement_source_evidence
  ADD CONSTRAINT wlt_settlement_source_evidence_pkey
  PRIMARY KEY (operator_context_id, order_id);
DROP INDEX IF EXISTS wlt_settlement_completion_event_uidx;
CREATE UNIQUE INDEX wlt_settlement_completion_event_OperatorContext_uidx
  ON wlt_settlement_source_evidence (operator_context_id, completion_event_id);
CREATE INDEX wlt_settlement_evidence_OperatorContext_settlement_idx
  ON wlt_settlement_source_evidence (operator_context_id, settlement_id, order_id);

ALTER TABLE wlt_settlement_requests
  ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_settlement_requests request
SET operator_context_id = settlement.operator_context_id
FROM wlt_settlements settlement
WHERE request.settlement_id = settlement.id
  AND (request.operator_context_id IS NULL OR btrim(request.operator_context_id) = '');
UPDATE wlt_settlement_requests
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_settlement_requests
  ALTER COLUMN operator_context_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_settlement_requests_pkey;
ALTER TABLE wlt_settlement_requests
  ADD CONSTRAINT wlt_settlement_requests_pkey
  PRIMARY KEY (operator_context_id, idempotency_key);
DROP INDEX IF EXISTS wlt_settlement_request_hash_uidx;
CREATE UNIQUE INDEX wlt_settlement_request_OperatorContext_hash_uidx
  ON wlt_settlement_requests (operator_context_id, request_hash);
CREATE INDEX wlt_settlement_request_OperatorContext_partner_idx
  ON wlt_settlement_requests (operator_context_id, partner_id, created_at DESC);

COMMENT ON COLUMN wlt_settlement_policies.operator_context_id IS
  'OperatorContext owning the settlement policy; active runtime never falls back to legacy-unscoped.';
COMMENT ON COLUMN wlt_settlement_requests.operator_context_id IS
  'OperatorContext-local idempotency and request evidence identity.';
COMMENT ON COLUMN wlt_settlement_source_evidence.operator_context_id IS
  'OperatorContext owning immutable DSH settlement evidence.';

COMMIT;
