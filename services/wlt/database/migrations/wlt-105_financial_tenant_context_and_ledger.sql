-- WLT-105: converge active financial writes on trusted per-request tenant truth.
--
-- Historical rows that cannot be attributed without external reconciliation stay
-- explicitly classified as legacy-unscoped. New active-SaaS code never reads or
-- writes that scope. Wallet accounts are attributed when one unambiguous WLT
-- wallet owner exists; transaction/line attribution follows those wallet legs.

ALTER TABLE wlt_ledger_accounts ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE wlt_ledger_transactions ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE wlt_ledger_lines ADD COLUMN IF NOT EXISTS tenant_id text;

WITH unambiguous_wallet_owner AS (
  SELECT actor_type, actor_id, currency, min(tenant_id) AS tenant_id
  FROM wlt_wallets
  WHERE btrim(tenant_id) <> ''
  GROUP BY actor_type, actor_id, currency
  HAVING count(DISTINCT tenant_id) = 1
)
UPDATE wlt_ledger_accounts account
SET tenant_id = owner.tenant_id
FROM unambiguous_wallet_owner owner
WHERE account.account_type = 'wallet'
  AND account.actor_type = owner.actor_type
  AND account.actor_id = owner.actor_id
  AND account.currency = owner.currency
  AND (account.tenant_id IS NULL OR btrim(account.tenant_id) = '');

WITH inferred_transaction_tenant AS (
  SELECT line.ledger_transaction_id,
         min(account.tenant_id) FILTER (WHERE account.tenant_id IS NOT NULL AND account.tenant_id <> 'legacy-unscoped') AS tenant_id
  FROM wlt_ledger_lines line
  JOIN wlt_ledger_accounts account ON account.id = line.account_id
  GROUP BY line.ledger_transaction_id
  HAVING count(DISTINCT account.tenant_id) FILTER (
           WHERE account.tenant_id IS NOT NULL AND account.tenant_id <> 'legacy-unscoped'
         ) = 1
)
UPDATE wlt_ledger_transactions transaction
SET tenant_id = inferred.tenant_id
FROM inferred_transaction_tenant inferred
WHERE transaction.id = inferred.ledger_transaction_id
  AND inferred.tenant_id IS NOT NULL
  AND (transaction.tenant_id IS NULL OR btrim(transaction.tenant_id) = '');

UPDATE wlt_ledger_accounts
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
UPDATE wlt_ledger_transactions
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
UPDATE wlt_ledger_lines line
SET tenant_id = transaction.tenant_id
FROM wlt_ledger_transactions transaction
WHERE line.ledger_transaction_id = transaction.id
  AND (line.tenant_id IS NULL OR btrim(line.tenant_id) = '');
UPDATE wlt_ledger_lines
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_ledger_accounts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE wlt_ledger_transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE wlt_ledger_lines ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE wlt_ledger_accounts
  ADD CONSTRAINT wlt_ledger_accounts_tenant_nonempty CHECK (btrim(tenant_id) <> '') NOT VALID;
ALTER TABLE wlt_ledger_transactions
  ADD CONSTRAINT wlt_ledger_transactions_tenant_nonempty CHECK (btrim(tenant_id) <> '') NOT VALID;
ALTER TABLE wlt_ledger_lines
  ADD CONSTRAINT wlt_ledger_lines_tenant_nonempty CHECK (btrim(tenant_id) <> '') NOT VALID;
ALTER TABLE wlt_ledger_accounts VALIDATE CONSTRAINT wlt_ledger_accounts_tenant_nonempty;
ALTER TABLE wlt_ledger_transactions VALIDATE CONSTRAINT wlt_ledger_transactions_tenant_nonempty;
ALTER TABLE wlt_ledger_lines VALIDATE CONSTRAINT wlt_ledger_lines_tenant_nonempty;

DROP INDEX IF EXISTS wlt_ledger_accounts_wallet_uq;
DROP INDEX IF EXISTS wlt_ledger_accounts_system_uq;
DROP INDEX IF EXISTS wlt_ledger_transactions_source_uq;

CREATE UNIQUE INDEX wlt_ledger_accounts_wallet_tenant_uq
  ON wlt_ledger_accounts (tenant_id, account_type, actor_type, actor_id, currency)
  WHERE account_type = 'wallet';
CREATE UNIQUE INDEX wlt_ledger_accounts_system_tenant_uq
  ON wlt_ledger_accounts (tenant_id, account_type, currency)
  WHERE account_type <> 'wallet';
CREATE UNIQUE INDEX wlt_ledger_transactions_source_tenant_uq
  ON wlt_ledger_transactions (tenant_id, transaction_type, reference_type, reference_id)
  WHERE reference_type <> '' AND reference_id <> '';
CREATE INDEX wlt_ledger_transactions_tenant_created_idx
  ON wlt_ledger_transactions (tenant_id, created_at DESC, id DESC);
CREATE INDEX wlt_ledger_lines_tenant_transaction_idx
  ON wlt_ledger_lines (tenant_id, ledger_transaction_id);
CREATE INDEX wlt_ledger_lines_tenant_account_idx
  ON wlt_ledger_lines (tenant_id, account_id, created_at DESC);

ALTER TABLE wlt_field_commission_category_policy_versions
  ADD COLUMN IF NOT EXISTS tenant_id text;
UPDATE wlt_field_commission_category_policy_versions
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_field_commission_category_policy_versions
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE wlt_field_commission_category_policy_versions
  DROP CONSTRAINT IF EXISTS wlt_field_commission_category_policy_versions_pkey;
ALTER TABLE wlt_field_commission_category_policy_versions
  ADD CONSTRAINT wlt_field_commission_category_policy_versions_pkey
  PRIMARY KEY (tenant_id, policy_id, version);
DROP INDEX IF EXISTS wlt_field_commission_category_policy_active_uq;
DROP INDEX IF EXISTS wlt_field_commission_category_policy_history_idx;
CREATE UNIQUE INDEX wlt_field_commission_category_policy_active_tenant_uq
  ON wlt_field_commission_category_policy_versions (tenant_id, partner_category)
  WHERE status = 'active';
CREATE INDEX wlt_field_commission_category_policy_tenant_history_idx
  ON wlt_field_commission_category_policy_versions (tenant_id, partner_category, version DESC);

WITH known_tenants AS (
  SELECT tenant_id FROM wlt_wallets WHERE tenant_id <> 'legacy-unscoped' AND btrim(tenant_id) <> ''
  UNION
  SELECT tenant_id FROM wlt_payment_sessions WHERE tenant_id <> 'legacy-unscoped' AND btrim(tenant_id) <> ''
  UNION
  SELECT tenant_id FROM wlt_commissions WHERE tenant_id <> 'legacy-unscoped' AND btrim(tenant_id) <> ''
), legacy_policies AS (
  SELECT * FROM wlt_field_commission_category_policy_versions WHERE tenant_id = 'legacy-unscoped'
)
INSERT INTO wlt_field_commission_category_policy_versions (
  tenant_id, policy_id, partner_category, version, fixed_amount_minor_units,
  currency, status, change_reason, updated_by_actor_id, created_at
)
SELECT tenant.tenant_id, policy.policy_id, policy.partner_category, policy.version,
       policy.fixed_amount_minor_units, policy.currency, policy.status,
       'tenant-isolated migration: ' || policy.change_reason,
       policy.updated_by_actor_id, policy.created_at
FROM known_tenants tenant
CROSS JOIN legacy_policies policy
ON CONFLICT (tenant_id, policy_id, version) DO NOTHING;

ALTER TABLE wlt_jrn036_commission_evidence ADD COLUMN IF NOT EXISTS tenant_id text;
UPDATE wlt_jrn036_commission_evidence evidence
SET tenant_id = commission.tenant_id
FROM wlt_commissions commission
WHERE commission.id = evidence.commission_id
  AND (evidence.tenant_id IS NULL OR btrim(evidence.tenant_id) = '');
UPDATE wlt_jrn036_commission_evidence
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_jrn036_commission_evidence ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE wlt_jrn036_commission_evidence
  DROP CONSTRAINT IF EXISTS wlt_jrn036_commission_evidence_idempotency_key_key;
DROP INDEX IF EXISTS wlt_jrn036_commission_request_hash_uidx;
CREATE UNIQUE INDEX wlt_jrn036_commission_evidence_tenant_idempotency_uq
  ON wlt_jrn036_commission_evidence (tenant_id, idempotency_key);
CREATE UNIQUE INDEX wlt_jrn036_commission_evidence_tenant_request_hash_uq
  ON wlt_jrn036_commission_evidence (tenant_id, request_hash);
CREATE INDEX wlt_jrn036_commission_evidence_tenant_commission_idx
  ON wlt_jrn036_commission_evidence (tenant_id, commission_id);

ALTER TABLE wlt_jrn036_audit_events ADD COLUMN IF NOT EXISTS tenant_id text;
UPDATE wlt_jrn036_audit_events
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_jrn036_audit_events ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX wlt_jrn036_audit_tenant_aggregate_idx
  ON wlt_jrn036_audit_events (tenant_id, aggregate_type, aggregate_id, created_at DESC);

COMMENT ON COLUMN wlt_ledger_accounts.tenant_id IS
  'Trusted tenant ownership. legacy-unscoped requires explicit financial reconciliation before production activation.';
COMMENT ON COLUMN wlt_field_commission_category_policy_versions.tenant_id IS
  'Tenant owning this WLT commission policy; active policy uniqueness is tenant-local.';
