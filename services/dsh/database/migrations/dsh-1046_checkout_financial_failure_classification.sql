-- DSH-1046: governed classification for checkout financial closure outcomes.
-- Unknown historical/provider outcomes remain readback-required; this migration
-- never infers provider absence, rejection, or application from legacy rows.

BEGIN;

ALTER TABLE dsh_checkout_financial_closure_outbox
  ADD COLUMN IF NOT EXISTS failure_classification TEXT NOT NULL DEFAULT 'UNKNOWN_REQUIRES_READBACK';

UPDATE dsh_checkout_financial_closure_outbox
SET failure_classification='UNKNOWN_REQUIRES_READBACK',
    failure_disposition='reconciliation_required',
    diagnostic_code=COALESCE(NULLIF(diagnostic_code,''), 'legacy_outcome_requires_readback')
WHERE status IN ('failed','unknown')
  AND (
    failure_classification IS NULL
    OR failure_classification NOT IN ('PROVEN_ABSENT','PROVEN_REJECTED','PROVEN_APPLIED','UNKNOWN_REQUIRES_READBACK','INVALID_UNRECOVERABLE')
    OR failure_classification='UNKNOWN_REQUIRES_READBACK'
  );

ALTER TABLE dsh_checkout_financial_closure_outbox
  DROP CONSTRAINT IF EXISTS dsh_checkout_financial_closure_outbox_failure_classification_check;

ALTER TABLE dsh_checkout_financial_closure_outbox
  ADD CONSTRAINT dsh_checkout_financial_closure_outbox_failure_classification_check
  CHECK (failure_classification IN (
    'PROVEN_ABSENT',
    'PROVEN_REJECTED',
    'PROVEN_APPLIED',
    'UNKNOWN_REQUIRES_READBACK',
    'INVALID_UNRECOVERABLE'
  ));

ALTER TABLE dsh_checkout_financial_closure_outbox
  ADD CONSTRAINT dsh_checkout_financial_closure_outbox_unknown_readback_check
  CHECK (
    failure_classification <> 'UNKNOWN_REQUIRES_READBACK'
    OR status IN ('unknown','failed','pending','processing','sent')
  );

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_financial_closure_outbox_failure_classification
  ON dsh_checkout_financial_closure_outbox(failure_classification, updated_at DESC);

COMMIT;

-- Classification law:
-- PROVEN_ABSENT: canonical readback proves the prior mutation is absent.
-- PROVEN_REJECTED: the provider/owner returned a definitive rejection.
-- PROVEN_APPLIED: canonical completion readback/commit proves application.
-- UNKNOWN_REQUIRES_READBACK: no mutation may be retried directly.
-- INVALID_UNRECOVERABLE: request/context is invalid and cannot be retried.
