-- WLT-105: converge active financial writes on trusted per-request OperatorContext truth.
--
-- Historical rows that cannot be attributed without external reconciliation stay
-- explicitly classified as legacy-unscoped. Embedded code must never select
-- that scope. Wallet accounts are attributed only when one unambiguous WLT
-- wallet owner exists; transaction and line attribution follows those wallet legs.

BEGIN;

ALTER TABLE wlt_ledger_accounts ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE wlt_ledger_transactions ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE wlt_ledger_lines ADD COLUMN IF NOT EXISTS operator_context_id text;

WITH unambiguous_wallet_owner AS (
  SELECT actor_type, actor_id, currency, min(operator_context_id) AS operator_context_id
  FROM wlt_wallets
  WHERE btrim(operator_context_id) <> '' AND operator_context_id <> 'legacy-unscoped'
  GROUP BY actor_type, actor_id, currency
  HAVING count(DISTINCT operator_context_id) = 1
)
UPDATE wlt_ledger_accounts account
SET operator_context_id = owner.operator_context_id
FROM unambiguous_wallet_owner owner
WHERE account.account_type = 'wallet'
  AND account.actor_type = owner.actor_type
  AND account.actor_id = owner.actor_id
  AND account.currency = owner.currency
  AND (account.operator_context_id IS NULL OR btrim(account.operator_context_id) = '');

WITH inferred_transaction_OperatorContext AS (
  SELECT line.ledger_transaction_id,
         min(account.operator_context_id) FILTER (
           WHERE account.operator_context_id IS NOT NULL AND account.operator_context_id <> 'legacy-unscoped'
         ) AS operator_context_id
  FROM wlt_ledger_lines line
  JOIN wlt_ledger_accounts account ON account.id = line.account_id
  GROUP BY line.ledger_transaction_id
  HAVING count(DISTINCT account.operator_context_id) FILTER (
           WHERE account.operator_context_id IS NOT NULL AND account.operator_context_id <> 'legacy-unscoped'
         ) = 1
)
UPDATE wlt_ledger_transactions transaction
SET operator_context_id = inferred.operator_context_id
FROM inferred_transaction_OperatorContext inferred
WHERE transaction.id = inferred.ledger_transaction_id
  AND inferred.operator_context_id IS NOT NULL
  AND (transaction.operator_context_id IS NULL OR btrim(transaction.operator_context_id) = '');

UPDATE wlt_ledger_accounts
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
UPDATE wlt_ledger_transactions
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
UPDATE wlt_ledger_lines line
SET operator_context_id = transaction.operator_context_id
FROM wlt_ledger_transactions transaction
WHERE line.ledger_transaction_id = transaction.id
  AND (line.operator_context_id IS NULL OR btrim(line.operator_context_id) = '');
UPDATE wlt_ledger_lines
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_ledger_accounts ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_ledger_transactions ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_ledger_lines ALTER COLUMN operator_context_id SET NOT NULL;

ALTER TABLE wlt_ledger_accounts
  ADD CONSTRAINT wlt_ledger_accounts_OperatorContext_nonempty CHECK (btrim(operator_context_id) <> '') NOT VALID;
ALTER TABLE wlt_ledger_transactions
  ADD CONSTRAINT wlt_ledger_transactions_OperatorContext_nonempty CHECK (btrim(operator_context_id) <> '') NOT VALID;
ALTER TABLE wlt_ledger_lines
  ADD CONSTRAINT wlt_ledger_lines_OperatorContext_nonempty CHECK (btrim(operator_context_id) <> '') NOT VALID;
ALTER TABLE wlt_ledger_accounts VALIDATE CONSTRAINT wlt_ledger_accounts_OperatorContext_nonempty;
ALTER TABLE wlt_ledger_transactions VALIDATE CONSTRAINT wlt_ledger_transactions_OperatorContext_nonempty;
ALTER TABLE wlt_ledger_lines VALIDATE CONSTRAINT wlt_ledger_lines_OperatorContext_nonempty;

DROP INDEX IF EXISTS wlt_ledger_accounts_wallet_uq;
DROP INDEX IF EXISTS wlt_ledger_accounts_system_uq;
DROP INDEX IF EXISTS wlt_ledger_transactions_source_uq;

CREATE UNIQUE INDEX wlt_ledger_accounts_wallet_OperatorContext_uq
  ON wlt_ledger_accounts (operator_context_id, account_type, actor_type, actor_id, currency)
  WHERE account_type = 'wallet';
CREATE UNIQUE INDEX wlt_ledger_accounts_system_OperatorContext_uq
  ON wlt_ledger_accounts (operator_context_id, account_type, currency)
  WHERE account_type <> 'wallet';
CREATE UNIQUE INDEX wlt_ledger_transactions_source_OperatorContext_uq
  ON wlt_ledger_transactions (operator_context_id, transaction_type, reference_type, reference_id)
  WHERE reference_type <> '' AND reference_id <> '';
CREATE INDEX wlt_ledger_transactions_OperatorContext_created_idx
  ON wlt_ledger_transactions (operator_context_id, created_at DESC, id DESC);
CREATE INDEX wlt_ledger_lines_OperatorContext_transaction_idx
  ON wlt_ledger_lines (operator_context_id, ledger_transaction_id);
CREATE INDEX wlt_ledger_lines_OperatorContext_account_idx
  ON wlt_ledger_lines (operator_context_id, account_id, created_at DESC);

ALTER TABLE wlt_field_commission_category_policy_versions
  ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_field_commission_category_policy_versions
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_field_commission_category_policy_versions
  ALTER COLUMN operator_context_id SET NOT NULL;

ALTER TABLE wlt_field_commission_category_policy_versions
  DROP CONSTRAINT IF EXISTS wlt_field_commission_category_policy_versions_pkey;
ALTER TABLE wlt_field_commission_category_policy_versions
  ADD CONSTRAINT wlt_field_commission_category_policy_versions_pkey
  PRIMARY KEY (operator_context_id, policy_id, version);
DROP INDEX IF EXISTS wlt_field_commission_category_policy_active_uq;
DROP INDEX IF EXISTS wlt_field_commission_category_policy_history_idx;
CREATE UNIQUE INDEX wlt_field_commission_category_policy_active_OperatorContext_uq
  ON wlt_field_commission_category_policy_versions (operator_context_id, partner_category)
  WHERE status = 'active';
CREATE INDEX wlt_field_commission_category_policy_OperatorContext_history_idx
  ON wlt_field_commission_category_policy_versions (operator_context_id, partner_category, version DESC);

WITH known_OperatorContexts AS (
  SELECT operator_context_id FROM wlt_wallets
  WHERE operator_context_id <> 'legacy-unscoped' AND btrim(operator_context_id) <> ''
  UNION
  SELECT operator_context_id FROM wlt_payment_sessions
  WHERE operator_context_id <> 'legacy-unscoped' AND btrim(operator_context_id) <> ''
  UNION
  SELECT operator_context_id FROM wlt_commissions
  WHERE operator_context_id <> 'legacy-unscoped' AND btrim(operator_context_id) <> ''
), legacy_policies AS (
  SELECT * FROM wlt_field_commission_category_policy_versions
  WHERE operator_context_id = 'legacy-unscoped'
)
INSERT INTO wlt_field_commission_category_policy_versions (
  operator_context_id, policy_id, partner_category, version, fixed_amount_minor_units,
  currency, status, change_reason, updated_by_actor_id, created_at
)
SELECT OperatorContext.operator_context_id, policy.policy_id, policy.partner_category, policy.version,
       policy.fixed_amount_minor_units, policy.currency, policy.status,
       'OperatorContext-isolated migration: ' || policy.change_reason,
       policy.updated_by_actor_id, policy.created_at
FROM known_OperatorContexts OperatorContext
CROSS JOIN legacy_policies policy
ON CONFLICT (operator_context_id, policy_id, version) DO NOTHING;

ALTER TABLE wlt_commission_evidence ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_commission_evidence evidence
SET operator_context_id = commission.operator_context_id
FROM wlt_commissions commission
WHERE commission.id = evidence.commission_id
  AND (evidence.operator_context_id IS NULL OR btrim(evidence.operator_context_id) = '');
UPDATE wlt_commission_evidence
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_commission_evidence
  ALTER COLUMN operator_context_id SET DEFAULT 'legacy-unscoped';
ALTER TABLE wlt_commission_evidence
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_commission_evidence
  DROP CONSTRAINT IF EXISTS wlt_commission_evidence_idempotency_key_key;
DROP INDEX IF EXISTS wlt_commission_request_hash_uidx;
CREATE UNIQUE INDEX wlt_commission_evidence_operator_context_idempotency_uq
  ON wlt_commission_evidence (operator_context_id, idempotency_key);
CREATE UNIQUE INDEX wlt_commission_evidence_OperatorContext_request_hash_uq
  ON wlt_commission_evidence (operator_context_id, request_hash);
CREATE INDEX wlt_commission_evidence_OperatorContext_commission_idx
  ON wlt_commission_evidence (operator_context_id, commission_id);

ALTER TABLE wlt_audit_events ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_audit_events
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_audit_events
  ALTER COLUMN operator_context_id SET DEFAULT 'legacy-unscoped';
ALTER TABLE wlt_audit_events
  ALTER COLUMN operator_context_id SET NOT NULL;
CREATE INDEX wlt_audit_OperatorContext_aggregate_idx
  ON wlt_audit_events (operator_context_id, aggregate_type, aggregate_id, created_at DESC);

ALTER TABLE wlt_mutation_receipts ADD COLUMN IF NOT EXISTS operator_context_id text;
UPDATE wlt_mutation_receipts
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
ALTER TABLE wlt_mutation_receipts
  ALTER COLUMN operator_context_id SET DEFAULT 'legacy-unscoped';
ALTER TABLE wlt_mutation_receipts
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_mutation_receipts
  DROP CONSTRAINT IF EXISTS wlt_mutation_receipts_pkey;
ALTER TABLE wlt_mutation_receipts
  ADD CONSTRAINT wlt_mutation_receipts_pkey
  PRIMARY KEY (operator_context_id, idempotency_key);
DROP INDEX IF EXISTS wlt_mutation_receipts_aggregate_idx;
DROP INDEX IF EXISTS wlt_mutation_receipts_request_hash_idx;
CREATE INDEX wlt_mutation_receipts_OperatorContext_aggregate_idx
  ON wlt_mutation_receipts (operator_context_id, mutation_type, aggregate_id, created_at DESC);
CREATE INDEX wlt_mutation_receipts_OperatorContext_request_hash_idx
  ON wlt_mutation_receipts (operator_context_id, request_hash);

COMMENT ON COLUMN wlt_ledger_accounts.operator_context_id IS
  'Trusted OperatorContext ownership. legacy-unscoped requires explicit financial reconciliation before production activation.';
COMMENT ON COLUMN wlt_field_commission_category_policy_versions.operator_context_id IS
  'OperatorContext owning this WLT commission policy; active policy uniqueness is OperatorContext-local.';
COMMENT ON COLUMN wlt_audit_events.operator_context_id IS
  'OperatorContext owning the audited financial aggregate. legacy-unscoped is compatibility-only and cannot prove isolation.';

COMMIT;
