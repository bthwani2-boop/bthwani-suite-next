-- WLT-959: canonical OperatorContext ownership for commercial truth.
-- Historical rows that cannot be proven tenant-local are retained under the
-- explicit legacy-unscoped context and recorded for governed remediation; they
-- are never silently merged across contexts.

BEGIN;

ALTER TABLE wlt_loyalty_accounts
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE wlt_loyalty_entries
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE wlt_client_subscriptions
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE wlt_subscription_lifecycle_events
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;
ALTER TABLE wlt_subscription_compensations
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

CREATE TABLE IF NOT EXISTS wlt_commercial_context_backfill_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  client_id TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id)
);

-- Payment sessions are the authoritative owner for subscription activation.
UPDATE wlt_client_subscriptions AS s
SET operator_context_id = p.operator_context_id
FROM wlt_payment_sessions AS p
WHERE s.operator_context_id IS NULL
  AND p.id = s.payment_session_id
  AND btrim(COALESCE(p.operator_context_id, '')) <> '';

-- Lifecycle side effects inherit the immutable subscription owner.
UPDATE wlt_subscription_lifecycle_events AS e
SET operator_context_id = s.operator_context_id
FROM wlt_client_subscriptions AS s
WHERE e.operator_context_id IS NULL
  AND e.subscription_id = s.id;
UPDATE wlt_subscription_compensations AS c
SET operator_context_id = s.operator_context_id
FROM wlt_client_subscriptions AS s
WHERE c.operator_context_id IS NULL
  AND c.subscription_id = s.id;

-- Activation entries inherit their canonical subscription owner.
UPDATE wlt_loyalty_entries AS e
SET operator_context_id = s.operator_context_id
FROM wlt_client_subscriptions AS s
WHERE e.operator_context_id IS NULL
  AND e.source_type = 'subscription_activation'
  AND e.source_id = s.id::TEXT;

-- For legacy client rows, infer ownership only when every available payment
-- session agrees. Ambiguous subjects remain explicitly quarantined.
INSERT INTO wlt_commercial_context_backfill_exceptions(entity_type, entity_id, client_id, reason)
SELECT 'client', p.client_id, p.client_id,
       'multiple payment OperatorContexts prevent deterministic commercial backfill'
FROM wlt_payment_sessions AS p
WHERE p.client_id IS NOT NULL
GROUP BY p.client_id
HAVING COUNT(DISTINCT p.operator_context_id) FILTER (WHERE btrim(COALESCE(p.operator_context_id, '')) <> '') > 1
ON CONFLICT (entity_type, entity_id) DO NOTHING;

UPDATE wlt_loyalty_entries AS e
SET operator_context_id = candidate.operator_context_id
FROM (
  SELECT e.id, MIN(p.operator_context_id) AS operator_context_id
  FROM wlt_loyalty_entries AS e
  JOIN wlt_payment_sessions AS p ON p.client_id = e.client_id
  WHERE e.operator_context_id IS NULL
    AND btrim(COALESCE(p.operator_context_id, '')) <> ''
  GROUP BY e.id
  HAVING COUNT(DISTINCT p.operator_context_id) = 1
) AS candidate
WHERE e.id = candidate.id;

UPDATE wlt_loyalty_accounts AS a
SET operator_context_id = candidate.operator_context_id
FROM (
  SELECT a.client_id, MIN(e.operator_context_id) AS operator_context_id
  FROM wlt_loyalty_accounts AS a
  JOIN wlt_loyalty_entries AS e ON e.client_id = a.client_id
  WHERE a.operator_context_id IS NULL
    AND btrim(COALESCE(e.operator_context_id, '')) <> ''
  GROUP BY a.client_id
  HAVING COUNT(DISTINCT e.operator_context_id) = 1
) AS candidate
WHERE a.operator_context_id IS NULL
  AND a.client_id = candidate.client_id;

-- Explicit quarantine context for historical rows without authoritative proof.
UPDATE wlt_loyalty_accounts SET operator_context_id = 'legacy-unscoped' WHERE operator_context_id IS NULL;
UPDATE wlt_loyalty_entries SET operator_context_id = 'legacy-unscoped' WHERE operator_context_id IS NULL;
UPDATE wlt_client_subscriptions SET operator_context_id = 'legacy-unscoped' WHERE operator_context_id IS NULL;
UPDATE wlt_subscription_lifecycle_events SET operator_context_id = 'legacy-unscoped' WHERE operator_context_id IS NULL;
UPDATE wlt_subscription_compensations SET operator_context_id = 'legacy-unscoped' WHERE operator_context_id IS NULL;

ALTER TABLE wlt_loyalty_accounts ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_loyalty_entries ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_client_subscriptions ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_subscription_lifecycle_events ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_subscription_compensations ALTER COLUMN operator_context_id SET NOT NULL;

-- Tenant-local identity and replay boundaries.
ALTER TABLE wlt_loyalty_entries DROP CONSTRAINT IF EXISTS wlt_loyalty_entries_client_id_fkey;
ALTER TABLE wlt_loyalty_accounts DROP CONSTRAINT IF EXISTS wlt_loyalty_accounts_pkey;
ALTER TABLE wlt_loyalty_accounts ADD CONSTRAINT wlt_loyalty_accounts_pkey PRIMARY KEY (operator_context_id, client_id);
ALTER TABLE wlt_loyalty_entries DROP CONSTRAINT IF EXISTS wlt_loyalty_entries_idempotency_key_key;
DROP INDEX IF EXISTS uq_wlt_loyalty_entry_context_idempotency;
DROP INDEX IF EXISTS wlt_loyalty_entries_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_loyalty_entry_context_idempotency
  ON wlt_loyalty_entries(operator_context_id, idempotency_key);
DROP INDEX IF EXISTS uq_wlt_loyalty_single_reversal;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_loyalty_single_reversal_context
  ON wlt_loyalty_entries(operator_context_id, reversal_of)
  WHERE reversal_of IS NOT NULL;
ALTER TABLE wlt_loyalty_entries ADD CONSTRAINT wlt_loyalty_entries_account_fkey
  FOREIGN KEY (operator_context_id, client_id)
  REFERENCES wlt_loyalty_accounts(operator_context_id, client_id)
  ON DELETE RESTRICT;

DROP INDEX IF EXISTS uq_wlt_client_active_subscription;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_client_active_subscription_context
  ON wlt_client_subscriptions(operator_context_id, client_id)
  WHERE status = 'active';

ALTER TABLE wlt_subscription_lifecycle_events DROP CONSTRAINT IF EXISTS wlt_subscription_lifecycle_events_idempotency_key_key;
DROP INDEX IF EXISTS wlt_subscription_lifecycle_events_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_subscription_event_context_idempotency
  ON wlt_subscription_lifecycle_events(operator_context_id, idempotency_key);

ALTER TABLE wlt_subscription_compensations DROP CONSTRAINT IF EXISTS wlt_subscription_compensations_subscription_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_subscription_compensation_context_subscription
  ON wlt_subscription_compensations(operator_context_id, subscription_id);

CREATE INDEX IF NOT EXISTS idx_wlt_loyalty_accounts_context_client
  ON wlt_loyalty_accounts(operator_context_id, client_id);
CREATE INDEX IF NOT EXISTS idx_wlt_loyalty_entries_context_client_created
  ON wlt_loyalty_entries(operator_context_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wlt_subscription_context_client_status
  ON wlt_client_subscriptions(operator_context_id, client_id, status);
CREATE INDEX IF NOT EXISTS idx_wlt_subscription_event_context_subscription
  ON wlt_subscription_lifecycle_events(operator_context_id, subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wlt_compensation_context_client_status
  ON wlt_subscription_compensations(operator_context_id, client_id, status, updated_at DESC);

-- Prevent ownership drift after cutover.
CREATE OR REPLACE FUNCTION wlt_guard_subscription_operator_context()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.operator_context_id <> OLD.operator_context_id THEN
    RAISE EXCEPTION 'subscription OperatorContext ownership is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_wlt_guard_subscription_operator_context ON wlt_client_subscriptions;
CREATE TRIGGER trg_wlt_guard_subscription_operator_context
BEFORE UPDATE ON wlt_client_subscriptions
FOR EACH ROW EXECUTE FUNCTION wlt_guard_subscription_operator_context();

CREATE OR REPLACE FUNCTION wlt_guard_loyalty_operator_context()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.operator_context_id <> OLD.operator_context_id THEN
    RAISE EXCEPTION 'loyalty OperatorContext ownership is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_wlt_guard_loyalty_account_operator_context ON wlt_loyalty_accounts;
CREATE TRIGGER trg_wlt_guard_loyalty_account_operator_context
BEFORE UPDATE ON wlt_loyalty_accounts
FOR EACH ROW EXECUTE FUNCTION wlt_guard_loyalty_operator_context();

COMMIT;
