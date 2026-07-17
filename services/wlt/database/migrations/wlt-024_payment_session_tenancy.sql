-- wlt-024_payment_session_tenancy.sql
-- Adds SaaS-ready deferred tenant ownership to DSH-sourced payment sessions.

BEGIN;

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'tenant-dev-001';

ALTER TABLE wlt_dsh_outbox_events
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'tenant-dev-001';

DROP INDEX IF EXISTS wlt_payment_sessions_checkout_intent_idx;
DROP INDEX IF EXISTS wlt_payment_sessions_special_request_idx;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_tenant_checkout_intent_idx
  ON wlt_payment_sessions (tenant_id, checkout_intent_id)
  WHERE checkout_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_tenant_special_request_idx
  ON wlt_payment_sessions (tenant_id, special_request_id)
  WHERE special_request_id IS NOT NULL;

COMMIT;
