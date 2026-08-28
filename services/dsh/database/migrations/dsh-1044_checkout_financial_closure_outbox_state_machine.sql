-- DSH-1044: canonical checkout financial closure outbox state machine.
--
-- This migration is intentionally the serial successor to the active
-- Service-Area migration namespace collision discovered during the audit. At
-- integration it must be ordered after that migration in the shared extension
-- manifest; it does not reuse the concurrent dsh-1043 filename.

BEGIN;

ALTER TABLE dsh_checkout_financial_closure_outbox
  DROP CONSTRAINT IF EXISTS dsh_checkout_financial_closure_outbox_status_check;

ALTER TABLE dsh_checkout_financial_closure_outbox
  ADD CONSTRAINT dsh_checkout_financial_closure_outbox_status_check
  CHECK (status IN ('pending','processing','unknown','sent','failed'));

ALTER TABLE dsh_checkout_financial_closure_outbox
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS readback_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_readback_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_disposition TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS diagnostic_code TEXT;

UPDATE dsh_checkout_financial_closure_outbox
SET failure_disposition='manual_retry_required',
    diagnostic_code='legacy_failed_requires_recovery'
WHERE status='failed' AND failure_disposition='none';

ALTER TABLE dsh_checkout_financial_closure_outbox
  DROP CONSTRAINT IF EXISTS dsh_checkout_financial_closure_outbox_failure_disposition_check;

ALTER TABLE dsh_checkout_financial_closure_outbox
  ADD CONSTRAINT dsh_checkout_financial_closure_outbox_failure_disposition_check
  CHECK (failure_disposition IN (
    'none',
    'retry_scheduled',
    'reconciliation_required',
    'manual_retry_required',
    'invalid_operator_context'
  ));

ALTER TABLE dsh_checkout_financial_closure_outbox
  DROP CONSTRAINT IF EXISTS dsh_checkout_financial_closure_outbox_attempt_count_check,
  DROP CONSTRAINT IF EXISTS dsh_checkout_financial_closure_outbox_readback_attempt_count_check,
  DROP CONSTRAINT IF EXISTS dsh_checkout_financial_closure_outbox_processing_lease_check,
  DROP CONSTRAINT IF EXISTS dsh_checkout_financial_closure_outbox_failed_disposition_check;

ALTER TABLE dsh_checkout_financial_closure_outbox
  ADD CONSTRAINT dsh_checkout_financial_closure_outbox_attempt_count_check
    CHECK (attempt_count >= 0),
  ADD CONSTRAINT dsh_checkout_financial_closure_outbox_readback_attempt_count_check
    CHECK (readback_attempt_count >= 0),
  ADD CONSTRAINT dsh_checkout_financial_closure_outbox_processing_lease_check
    CHECK (status <> 'processing' OR (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
  ADD CONSTRAINT dsh_checkout_financial_closure_outbox_failed_disposition_check
    CHECK (status <> 'failed' OR failure_disposition <> 'none');

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_financial_closure_outbox_recovery_due
  ON dsh_checkout_financial_closure_outbox(status, next_retry_at, created_at)
  WHERE status IN ('pending','unknown');

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_financial_closure_outbox_processing_lease
  ON dsh_checkout_financial_closure_outbox(lease_expires_at, updated_at)
  WHERE status='processing';

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_financial_closure_outbox_failed_disposition
  ON dsh_checkout_financial_closure_outbox(failure_disposition, updated_at DESC)
  WHERE status='failed';

COMMIT;
