-- WLT-029: lock payment sessions to an explicit trusted tenant identity.
--
-- Legacy development rows are backfilled once during migration. Runtime code
-- no longer falls back to a synthetic tenant and every new session must carry
-- the tenant resolved by authenticated DSH identity.

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_payment_sessions
SET tenant_id = 'tenant-dev-001'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_payment_sessions
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_tenant_id_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_tenant_id_chk CHECK (btrim(tenant_id) <> '');

CREATE INDEX IF NOT EXISTS wlt_payment_sessions_tenant_id_idx
  ON wlt_payment_sessions (tenant_id, created_at DESC, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_tenant_checkout_uq
  ON wlt_payment_sessions (tenant_id, checkout_intent_id)
  WHERE checkout_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_tenant_special_request_uq
  ON wlt_payment_sessions (tenant_id, special_request_id)
  WHERE special_request_id IS NOT NULL;

COMMENT ON COLUMN wlt_payment_sessions.tenant_id IS
  'Trusted DSH identity tenant. Mandatory; runtime fallback is forbidden.';
