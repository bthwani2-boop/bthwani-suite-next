-- DSH-961 / JRN-024: append-only receipts for every replayable field mutation.
-- Receipts are written in the same PostgreSQL transaction as the business row.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_field_readiness_operation_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dsh_field_readiness_receipts_tenant_chk CHECK (length(btrim(tenant_id)) > 0),
  CONSTRAINT dsh_field_readiness_receipts_actor_chk CHECK (length(btrim(actor_id)) > 0),
  CONSTRAINT dsh_field_readiness_receipts_key_chk CHECK (
    length(btrim(idempotency_key)) BETWEEN 8 AND 200
  ),
  CONSTRAINT dsh_field_readiness_receipts_correlation_chk CHECK (
    length(btrim(correlation_id)) BETWEEN 1 AND 200
  ),
  CONSTRAINT dsh_field_readiness_receipts_operation_chk CHECK (
    operation IN ('create_visit', 'complete_visit', 'upsert_readiness_check', 'create_escalation')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS dsh_field_readiness_receipts_identity_uq
  ON dsh_field_readiness_operation_receipts
    (tenant_id, actor_id, operation, idempotency_key);

CREATE INDEX IF NOT EXISTS dsh_field_readiness_receipts_resource_idx
  ON dsh_field_readiness_operation_receipts
    (tenant_id, operation, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dsh_field_readiness_receipts_correlation_idx
  ON dsh_field_readiness_operation_receipts
    (tenant_id, correlation_id, created_at DESC);

COMMIT;
