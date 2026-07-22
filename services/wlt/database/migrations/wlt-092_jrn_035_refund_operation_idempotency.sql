-- WLT-092 / JRN-035: durable idempotency receipts for every refund mutation.
-- A receipt is claimed before the business handler runs and completed before
-- the HTTP response is released. Replays return the stored response; changed
-- payloads conflict without repeating provider or ledger side effects.
BEGIN;

CREATE TABLE IF NOT EXISTS wlt_refund_operation_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_path TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  correlation_id TEXT,
  request_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  response_status INTEGER,
  response_content_type TEXT,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT wlt_refund_operation_receipts_operation_chk
    CHECK (operation IN ('create','approve','reject','complete','reconcile')),
  CONSTRAINT wlt_refund_operation_receipts_status_chk
    CHECK (status IN ('processing','completed')),
  CONSTRAINT wlt_refund_operation_receipts_response_chk
    CHECK (
      (status = 'processing' AND response_status IS NULL AND completed_at IS NULL)
      OR
      (status = 'completed' AND response_status BETWEEN 100 AND 599 AND response_body IS NOT NULL AND completed_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_refund_operation_receipts_identity_uq
  ON wlt_refund_operation_receipts (tenant_id, operation, request_path, idempotency_key);

CREATE INDEX IF NOT EXISTS wlt_refund_operation_receipts_processing_idx
  ON wlt_refund_operation_receipts (created_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS wlt_refund_operation_receipts_correlation_idx
  ON wlt_refund_operation_receipts (tenant_id, correlation_id, created_at DESC)
  WHERE correlation_id IS NOT NULL;

COMMIT;
