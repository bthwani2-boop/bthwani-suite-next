-- dsh-056_special_requests_tenancy.sql
-- Adds SaaS-ready deferred tenant ownership to special-request truth.

BEGIN;

ALTER TABLE dsh_special_requests
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'tenant-dev-001';

DROP INDEX IF EXISTS idx_dsh_special_req_idemp;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_special_req_tenant_client_idemp
  ON dsh_special_requests (tenant_id, client_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_special_req_tenant_client
  ON dsh_special_requests (tenant_id, client_id);

CREATE INDEX IF NOT EXISTS idx_dsh_special_req_tenant_operator_filters
  ON dsh_special_requests (tenant_id, request_type, status, workflow_stage);

COMMIT;
