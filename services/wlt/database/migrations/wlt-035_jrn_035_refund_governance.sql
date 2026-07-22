-- WLT-035 / JRN-035: governed financial refund lifecycle.
-- WLT remains the only owner of refund, provider, ledger and reconciliation truth.
BEGIN;

ALTER TABLE wlt_refunds
  ADD COLUMN IF NOT EXISTS tenant_id TEXT,
  ADD COLUMN IF NOT EXISTS requested_by_operator_id TEXT NOT NULL DEFAULT 'dsh-order-cancellation',
  ADD COLUMN IF NOT EXISTS approved_by_operator_id TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by_operator_id TEXT,
  ADD COLUMN IF NOT EXISTS decision_reason TEXT,
  ADD COLUMN IF NOT EXISTS eligibility_reference TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS provider_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_error TEXT,
  ADD COLUMN IF NOT EXISTS provider_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciliation_case_id TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

UPDATE wlt_refunds r
SET tenant_id = ps.tenant_id
FROM wlt_payment_sessions ps
WHERE ps.id = r.payment_session_id
  AND (r.tenant_id IS NULL OR r.tenant_id = '');

UPDATE wlt_refunds
SET tenant_id = 'tenant-dev-001'
WHERE tenant_id IS NULL OR tenant_id = '';

UPDATE wlt_refunds
SET idempotency_key = 'legacy:' || id
WHERE idempotency_key IS NULL OR idempotency_key = '';

UPDATE wlt_refunds
SET provider_idempotency_key = 'refund:' || id
WHERE provider_idempotency_key IS NULL OR provider_idempotency_key = '';

ALTER TABLE wlt_refunds
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN idempotency_key SET NOT NULL,
  ALTER COLUMN provider_idempotency_key SET NOT NULL;

ALTER TABLE wlt_refunds
  DROP CONSTRAINT IF EXISTS wlt_refunds_status_chk;
ALTER TABLE wlt_refunds
  ADD CONSTRAINT wlt_refunds_status_chk
  CHECK (status IN ('requested','approved','processing','provider_unknown','completed','rejected','reversed'));

ALTER TABLE wlt_refunds
  DROP CONSTRAINT IF EXISTS wlt_refunds_amount_positive_chk;
ALTER TABLE wlt_refunds
  ADD CONSTRAINT wlt_refunds_amount_positive_chk CHECK (amount_minor_units > 0) NOT VALID;

ALTER TABLE wlt_refunds
  DROP CONSTRAINT IF EXISTS wlt_refunds_maker_checker_chk;
ALTER TABLE wlt_refunds
  ADD CONSTRAINT wlt_refunds_maker_checker_chk CHECK (
    (approved_by_operator_id IS NULL OR approved_by_operator_id <> requested_by_operator_id)
    AND (rejected_by_operator_id IS NULL OR rejected_by_operator_id <> requested_by_operator_id)
  );

DROP INDEX IF EXISTS wlt_refunds_active_session_idx;
CREATE UNIQUE INDEX IF NOT EXISTS wlt_refunds_session_idempotency_idx
  ON wlt_refunds (tenant_id, payment_session_id, idempotency_key);
CREATE INDEX IF NOT EXISTS wlt_refunds_remaining_amount_idx
  ON wlt_refunds (tenant_id, payment_session_id, status);
CREATE INDEX IF NOT EXISTS wlt_refunds_provider_unknown_idx
  ON wlt_refunds (tenant_id, updated_at)
  WHERE status = 'provider_unknown';

CREATE TABLE IF NOT EXISTS wlt_refund_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id TEXT NOT NULL REFERENCES wlt_refunds(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,
  provider_reference TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wlt_refund_audit_actor_type_chk
    CHECK (actor_type IN ('operator','service','provider','reconciler','system'))
);
CREATE INDEX IF NOT EXISTS wlt_refund_audit_refund_idx
  ON wlt_refund_audit_events (refund_id, created_at);
CREATE INDEX IF NOT EXISTS wlt_refund_audit_tenant_idx
  ON wlt_refund_audit_events (tenant_id, created_at DESC);

ALTER TABLE wlt_reconciliation_cases
  DROP CONSTRAINT IF EXISTS wlt_reconciliation_cases_operation_check;
ALTER TABLE wlt_reconciliation_cases
  DROP CONSTRAINT IF EXISTS wlt_reconciliation_cases_operation_chk;
ALTER TABLE wlt_reconciliation_cases
  ADD CONSTRAINT wlt_reconciliation_cases_operation_chk
  CHECK (operation IN ('authorize','capture','refund'));

ALTER TABLE wlt_refunds
  DROP CONSTRAINT IF EXISTS wlt_refunds_reconciliation_case_fk;
ALTER TABLE wlt_refunds
  ADD CONSTRAINT wlt_refunds_reconciliation_case_fk
  FOREIGN KEY (reconciliation_case_id) REFERENCES wlt_reconciliation_cases(id) NOT VALID;

ALTER TABLE wlt_dsh_outbox_events
  ADD COLUMN IF NOT EXISTS order_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_reference TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

ALTER TABLE wlt_dsh_outbox_events
  DROP CONSTRAINT IF EXISTS wlt_dsh_outbox_events_payment_session_id_event_type_key;
DROP INDEX IF EXISTS wlt_dsh_outbox_events_payment_event_idx;
DROP INDEX IF EXISTS wlt_dsh_outbox_events_refund_event_idx;
CREATE UNIQUE INDEX wlt_dsh_outbox_events_payment_event_idx
  ON wlt_dsh_outbox_events (payment_session_id, event_type)
  WHERE refund_reference IS NULL;
CREATE UNIQUE INDEX wlt_dsh_outbox_events_refund_event_idx
  ON wlt_dsh_outbox_events (refund_reference, event_type)
  WHERE refund_reference IS NOT NULL;

ALTER TABLE wlt_refund_status_refs
  DROP CONSTRAINT IF EXISTS wlt_refund_status_refs_status_chk;
ALTER TABLE wlt_refund_status_refs
  ADD CONSTRAINT wlt_refund_status_refs_status_chk
  CHECK (status IN ('none','requested','approved','processing','provider_unknown','partially_refunded','completed','rejected'));

COMMIT;
